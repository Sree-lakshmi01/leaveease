from django import forms
from django.utils import timezone
from .models import AIAgentConfig, LeaveRequest, LeaveType, Holiday, LeaveBalance

class LeaveRequestForm(forms.ModelForm):
    class Meta:
        model = LeaveRequest
        fields = ('leave_type', 'start_date', 'end_date', 'reason', 'medical_certificate')
        widgets = {
            'leave_type': forms.Select(attrs={'class': 'form-select glass-input', 'id': 'id_leave_type'}),
            'start_date': forms.DateInput(attrs={'class': 'form-control glass-input', 'type': 'date', 'id': 'id_start_date'}),
            'end_date': forms.DateInput(attrs={'class': 'form-control glass-input', 'type': 'date', 'id': 'id_end_date'}),
            'reason': forms.Textarea(attrs={'class': 'form-control glass-input', 'rows': 4, 'placeholder': 'Provide details for your leave request...', 'id': 'leave_reason'}),
            'medical_certificate': forms.ClearableFileInput(attrs={'class': 'form-control glass-input', 'id': 'id_medical_cert'}),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if self.user:
            # Only show leave types where the user has balance remaining, or just all leave types but display their names.
            # We can customize querysets if needed.
            pass

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        leave_type = cleaned_data.get('leave_type')

        if start_date and end_date:
            if start_date > end_date:
                raise forms.ValidationError("Start Date cannot be after End Date.")
            
            # Check overlap with existing pending/approved requests
            overlap_requests = LeaveRequest.objects.filter(
                user=self.user,
                status__in=['HR_PENDING', 'ADMIN_PENDING', 'APPROVED']
            ).filter(
                start_date__lte=end_date,
                end_date__gte=start_date
            )
            
            # Exclude current request if editing
            if self.instance and self.instance.pk:
                overlap_requests = overlap_requests.exclude(pk=self.instance.pk)
                
            if overlap_requests.exists():
                raise forms.ValidationError("You have already applied for leave during these dates.")

            # Calculate duration
            duration = (end_date - start_date).days + 1
            
            if leave_type and self.user:
                try:
                    balance = LeaveBalance.objects.get(user=self.user, leave_type=leave_type)
                    if duration > balance.remaining:
                        raise forms.ValidationError(
                            f"Insufficient leave balance! Requested: {duration} days, Available: {balance.remaining} days."
                        )
                except LeaveBalance.DoesNotExist:
                    raise forms.ValidationError("You do not have a leave balance defined for this leave type.")

        return cleaned_data

class LeaveTypeForm(forms.ModelForm):
    class Meta:
        model = LeaveType
        fields = ('name', 'description', 'allocated_days', 'color_code')
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control glass-input', 'placeholder': 'e.g. Sick Leave'}),
            'description': forms.Textarea(attrs={'class': 'form-control glass-input', 'rows': 3, 'placeholder': 'Description...'}),
            'allocated_days': forms.NumberInput(attrs={'class': 'form-control glass-input', 'min': 0}),
            'color_code': forms.TextInput(attrs={'class': 'form-control glass-input', 'type': 'color'}),
        }

class HolidayForm(forms.ModelForm):
    class Meta:
        model = Holiday
        fields = ('name', 'date', 'description')
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control glass-input', 'placeholder': 'e.g. New Year\'s Day'}),
            'date': forms.DateInput(attrs={'class': 'form-control glass-input', 'type': 'date'}),
            'description': forms.Textarea(attrs={'class': 'form-control glass-input', 'rows': 2, 'placeholder': 'Optional description...'}),
        }


class AIAgentConfigForm(forms.ModelForm):
    class Meta:
        model = AIAgentConfig
        fields = ('name', 'provider', 'model', 'api_key_env_var', 'system_prompt', 'is_enabled', 'is_default')
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control glass-input', 'placeholder': 'e.g. Leave assistant'}),
            'provider': forms.Select(attrs={'class': 'form-select glass-input'}),
            'model': forms.TextInput(attrs={'class': 'form-control glass-input', 'placeholder': 'e.g. gpt-4.1-mini'}),
            'api_key_env_var': forms.TextInput(attrs={'class': 'form-control glass-input', 'placeholder': 'e.g. OPENAI_API_KEY'}),
            'system_prompt': forms.Textarea(attrs={'class': 'form-control glass-input', 'rows': 4, 'placeholder': 'Optional instructions for this agent...'}),
            'is_enabled': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_default': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
