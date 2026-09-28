from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

class LeaveType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    allocated_days = models.IntegerField(default=10)
    color_code = models.CharField(max_length=7, default='#3b82f6')  # Hex code (e.g. #3b82f6)

    def __str__(self):
        return self.name

class LeaveBalance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    allocated = models.IntegerField()
    used = models.IntegerField(default=0)
    remaining = models.IntegerField()

    class Meta:
        unique_together = ('user', 'leave_type')

    def save(self, *args, **kwargs):
        # Automatically update remaining based on allocated and used
        self.remaining = self.allocated - self.used
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.leave_type.name}: {self.remaining}/{self.allocated} Days"

class LeaveRequest(models.Model):
    STATUS_CHOICES = (
        ('HR_PENDING', 'HR Pending'),
        ('ADMIN_PENDING', 'Admin Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    medical_certificate = models.FileField(upload_to='medical_certs/', blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='HR_PENDING')
    admin_remarks = models.TextField(blank=True, null=True)
    hr_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='hr_approvals')
    hr_approved_at = models.DateTimeField(null=True, blank=True)
    admin_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_approvals')
    admin_approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    applied_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    @property
    def duration(self):
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0

    @property
    def task_reassignments_json(self):
        import json
        items = []
        for tr in self.task_reassignments.all():
            items.append({
                'id': tr.id,
                'title': tr.task_title,
                'assignee': tr.reassigned_to.get_full_name() or tr.reassigned_to.username,
                'assignee_role': getattr(tr.reassigned_to, 'role', 'EMPLOYEE'),
                'notes': tr.notes or '',
                'status': tr.status,
                'status_display': tr.get_status_display()
            })
        return json.dumps(items)

    @property
    def user_balances_json(self):
        import json
        items = []
        for b in self.user.balances.all():
            items.append({
                'type': b.leave_type.name,
                'allocated': b.allocated,
                'used': b.used,
                'remaining': b.remaining,
                'color': b.leave_type.color_code
            })
        return json.dumps(items)

    def __str__(self):
        return f"{self.user.username} - {self.leave_type.name} ({self.start_date} to {self.end_date})"

class Holiday(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField(unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.date})"

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:30]}"


class AIAuditLog(models.Model):
    ACTION_CHOICES = (
        ('AUTO_APPROVED', 'Auto Approved'),
        ('FLAGGED', 'Flagged for Review'),
        ('REJECTED', 'Auto Rejected'),
        ('HALT', 'Halted'),
    )

    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name='ai_audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    confidence_score = models.FloatField(default=1.0)
    extracted_reason = models.TextField(blank=True, null=True)
    document_verified = models.BooleanField(default=False)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"AI Audit #{self.id} for Request #{self.leave_request_id} - {self.action}"


class TaskReassignment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('COMPLETED', 'Completed'),
    )

    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name='task_reassignments')
    original_owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reassigned_from')
    reassigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reassigned_to')
    task_title = models.CharField(max_length=200)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"Task '{self.task_title}' reassigned to {self.reassigned_to.username}"



class AIAgentConfig(models.Model):
    """A selectable AI model configuration. API keys stay in environment variables."""
    PROVIDER_CHOICES = (
        ('OPENAI', 'OpenAI'),
        ('ANTHROPIC', 'Anthropic'),
        ('GOOGLE', 'Google Gemini'),
        ('CUSTOM', 'Custom / OpenAI-compatible'),
    )

    name = models.CharField(max_length=80, unique=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    model = models.CharField(max_length=100)
    api_key_env_var = models.CharField(
        max_length=100,
        help_text='Environment variable containing this provider API key (for example, OPENAI_API_KEY).',
    )
    system_prompt = models.TextField(blank=True)
    is_enabled = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-is_default', 'name')

    def save(self, *args, **kwargs):
        if self.is_default:
            AIAgentConfig.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.model})"


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present'),
        ('HALF_DAY', 'Half-Day'),
        ('ABSENT', 'Absent'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField(default=timezone.now)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ABSENT')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ('-date', '-check_in')

    def save(self, *args, **kwargs):
        if self.check_in and self.check_out:
            dummy_date = self.date or timezone.now().date()
            dt_in = datetime.combine(dummy_date, self.check_in)
            dt_out = datetime.combine(dummy_date, self.check_out)
            if dt_out < dt_in:
                dt_out += timedelta(days=1)
            diff = dt_out - dt_in
            hours = Decimal(str(round(diff.total_seconds() / 3600.0, 2)))
            self.total_hours = hours
            
            # Auto-assign status based on total_hours: >=8 => Present, >=4 => Half-Day, else Absent
            if self.total_hours >= Decimal('8.00'):
                self.status = 'PRESENT'
            elif self.total_hours >= Decimal('4.00'):
                self.status = 'HALF_DAY'
            else:
                self.status = 'ABSENT'
        elif self.check_in and not self.check_out:
            self.total_hours = Decimal('0.00')
            if not self.status or self.status == 'ABSENT':
                self.status = 'PRESENT'
        else:
            self.total_hours = Decimal('0.00')
            self.status = 'ABSENT'

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.date} ({self.get_status_display()})"


# Signals to automatically manage Leave Balances
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_leave_balances(sender, instance, created, **kwargs):
    if created and instance.role == 'EMPLOYEE':
        # Create a leave balance for every leave type
        for leave_type in LeaveType.objects.all():
            LeaveBalance.objects.get_or_create(
                user=instance,
                leave_type=leave_type,
                defaults={
                    'allocated': leave_type.allocated_days,
                    'used': 0,
                    'remaining': leave_type.allocated_days
                }
            )

@receiver(post_save, sender=LeaveType)
def create_leave_type_balances(sender, instance, created, **kwargs):
    if created:
        # Create a leave balance for every employee user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for employee in User.objects.filter(role='EMPLOYEE'):
            LeaveBalance.objects.get_or_create(
                user=employee,
                leave_type=instance,
                defaults={
                    'allocated': instance.allocated_days,
                    'used': 0,
                    'remaining': instance.allocated_days
                }
            )

