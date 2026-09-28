import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.http import HttpResponse, JsonResponse, HttpResponseForbidden
from django.db.models import Count, Sum, Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
from datetime import datetime, date
from decimal import Decimal
from accounts.models import User
from .models import AIAgentConfig, LeaveType, LeaveBalance, LeaveRequest, Holiday, Notification, Attendance

from .forms import AIAgentConfigForm, LeaveRequestForm, LeaveTypeForm, HolidayForm

def is_admin(user):
    return user.role == 'ADMIN'

def is_hr(user):
    return user.role == 'HR'

def is_employee(user):
    return user.role == 'EMPLOYEE'

def is_hr_or_admin(user):
    return user.role in ['HR', 'ADMIN']

@login_required
def dashboard_redirect(request):
    if request.user.role == 'ADMIN':
        return redirect('admin_dashboard')
    elif request.user.role == 'HR':
        return redirect('hr_dashboard')
    else:
        return redirect('employee_dashboard')

@login_required
def employee_dashboard(request):
    if not is_employee(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('admin_dashboard')
        
    balances = LeaveBalance.objects.filter(user=request.user).select_related('leave_type')
    recent_leaves = LeaveRequest.objects.filter(user=request.user).select_related('leave_type', 'hr_approved_by', 'admin_approved_by').prefetch_related('user__balances__leave_type', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')[:5]
    upcoming_holidays = Holiday.objects.filter(date__gte=timezone.now().date()).order_by('date')[:5]

    
    # Calculate stats
    total_requested = LeaveRequest.objects.filter(user=request.user).count()
    approved = LeaveRequest.objects.filter(user=request.user, status='APPROVED').count()
    pending = LeaveRequest.objects.filter(user=request.user, status__in=['HR_PENDING', 'ADMIN_PENDING']).count()
    rejected = LeaveRequest.objects.filter(user=request.user, status='REJECTED').count()
    
    context = {
        'balances': balances,
        'recent_leaves': recent_leaves,
        'upcoming_holidays': upcoming_holidays,
        'stats': {
            'total': total_requested,
            'approved': approved,
            'pending': pending,
            'rejected': rejected
        }
    }
    return render(request, 'employee/dashboard.html', context)

@login_required
def apply_leave_view(request):
    if not is_employee(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('admin_dashboard')
        
    if request.method == 'POST':
        form = LeaveRequestForm(request.POST, request.FILES, user=request.user)
        if form.is_valid():
            leave_req = form.save(commit=False)
            leave_req.user = request.user
            leave_req.status = 'HR_PENDING'
            leave_req.save()
            
            # Notification for Employee
            Notification.objects.create(
                user=request.user,
                message=f"Your request for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date}) was submitted and is pending HR review."
            )

            # Notification for HR Managers
            for hr_user in User.objects.filter(role='HR'):
                Notification.objects.create(
                    user=hr_user,
                    message=f"New leave request submitted by {request.user.get_full_name() or request.user.username} for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date})."
                )
            
            messages.success(request, "Leave request submitted successfully! Pending HR review.")
            return redirect('leave_history')
        else:
            messages.error(request, "Please correct the errors in the form.")
    else:
        form = LeaveRequestForm(user=request.user)
        
    balances = LeaveBalance.objects.filter(user=request.user).select_related('leave_type')
    return render(request, 'employee/apply_leave.html', {'form': form, 'balances': balances})

@login_required
def leave_history_view(request):
    if not is_employee(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('admin_dashboard')
        
    status_filter = request.GET.get('status', 'ALL')
    leaves = LeaveRequest.objects.filter(user=request.user).select_related('leave_type', 'hr_approved_by', 'admin_approved_by').prefetch_related('user__balances__leave_type', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')

    
    if status_filter == 'PENDING':
        leaves = leaves.filter(status__in=['HR_PENDING', 'ADMIN_PENDING'])
    elif status_filter != 'ALL':
        leaves = leaves.filter(status=status_filter)
        
    context = {
        'leaves': leaves,
        'status_filter': status_filter,
        'status_choices': LeaveRequest.STATUS_CHOICES
    }
    return render(request, 'employee/leave_history.html', context)

@login_required
def cancel_leave_view(request, pk):
    if not is_employee(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('admin_dashboard')
        
    leave_req = get_object_or_404(LeaveRequest, pk=pk, user=request.user)
    if leave_req.status in ['HR_PENDING', 'ADMIN_PENDING']:
        leave_req.status = 'CANCELLED'
        leave_req.save()
        
        # Notification
        Notification.objects.create(
            user=request.user,
            message=f"Your leave request for {leave_req.start_date} has been cancelled."
        )
        
        messages.success(request, "Leave request cancelled successfully.")
    else:
        messages.error(request, "Only pending leave requests can be cancelled.")
    return redirect('leave_history')

# ===================================================
# HR DASHBOARD & WORKFLOW VIEWS
# ===================================================
@login_required
def hr_dashboard(request):
    if not is_hr_or_admin(request.user):
        return redirect('employee_dashboard')
        
    today = timezone.now().date()
    current_month = today.month
    current_year = today.year
    
    # Summary Metrics
    hr_pending_count = LeaveRequest.objects.filter(status='HR_PENDING').count()
    admin_pending_count = LeaveRequest.objects.filter(status='ADMIN_PENDING').count()
    approved_this_month = LeaveRequest.objects.filter(
        status='APPROVED',
        updated_on__month=current_month,
        updated_on__year=current_year
    ).count()
    rejected_this_month = LeaveRequest.objects.filter(
        status='REJECTED',
        updated_on__month=current_month,
        updated_on__year=current_year
    ).count()
    
    # Employee overview stats for HR
    total_employees = User.objects.filter(role='EMPLOYEE').count()
    active_employees = User.objects.filter(role='EMPLOYEE', is_active=True).count()
    
    # Employees currently on leave today
    on_leave_today_qs = LeaveRequest.objects.filter(
        status='APPROVED',
        start_date__lte=today,
        end_date__gte=today
    ).select_related('user', 'leave_type')
    on_leave_today_count = on_leave_today_qs.values('user').distinct().count()

    # Actionable Pending Requests (HR_PENDING)
    pending_requests = LeaveRequest.objects.filter(status='HR_PENDING').select_related('user', 'leave_type').prefetch_related('user__balances__leave_type', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')
    
    # Activity Feed / Recent HR reviews
    recent_activity = LeaveRequest.objects.filter(hr_approved_by__isnull=False).select_related('user', 'leave_type', 'hr_approved_by').order_by('-hr_approved_at')[:10]
    team_members = User.objects.filter(is_active=True).order_by('first_name', 'username')
    
    # Prepare dynamic team members data list for JavaScript task reassignment
    team_members_data = []
    for idx, m in enumerate(team_members):
        team_members_data.append({
            'id': f"m-{m.pk}",
            'pk': m.pk,
            'name': m.get_full_name() or m.username,
            'role': getattr(m, 'designation', '') or getattr(m, 'department', '') or 'Team Member',
            'avatar': m.profile_pic.url if getattr(m, 'profile_pic', None) else '',
            'baseLoad': (idx % 3) + 1,
            'maxCap': 6
        })
        
    # Leave Type Distribution for HR Dashboard Analytics
    leave_type_distribution = list(
        LeaveRequest.objects.values('leave_type__name', 'leave_type__color_code')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    
    context = {
        'stats': {
            'hr_pending': hr_pending_count,
            'admin_pending': admin_pending_count,
            'approved_month': approved_this_month,
            'rejected_month': rejected_this_month,
            'total_employees': total_employees,
            'active_employees': active_employees,
            'on_leave_today': on_leave_today_count,
        },
        'pending_requests': pending_requests,
        'recent_activity': recent_activity,
        'team_members': team_members,
        'team_members_data': team_members_data,
        'on_leave_today_list': on_leave_today_qs,
        'leave_type_distribution': leave_type_distribution,
    }
    return render(request, 'hr/dashboard.html', context)


@login_required
def hr_bulk_approve(request):
    if not is_hr_or_admin(request.user):
        return redirect('employee_dashboard')
        
    if request.method == 'POST':
        request_ids = request.POST.getlist('request_ids')
        action = request.POST.get('bulk_action', 'approve')
        
        if request_ids:
            requests_qs = LeaveRequest.objects.filter(pk__in=request_ids, status='HR_PENDING')
            count = requests_qs.count()
            
            if action == 'approve':
                for leave_req in requests_qs:
                    leave_req.status = 'ADMIN_PENDING'
                    leave_req.hr_approved_by = request.user
                    leave_req.hr_approved_at = timezone.now()
                    leave_req.admin_remarks = "HR Note: Bulk verified & approved by HR"
                    leave_req.save()
                    
                    Notification.objects.create(
                        user=leave_req.user,
                        message=f"HR approved your {leave_req.leave_type.name} request ({leave_req.start_date} to {leave_req.end_date}). Forwarded to Admin for final approval."
                    )
                    
                    for admin_user in User.objects.filter(role='ADMIN'):
                        Notification.objects.create(
                            user=admin_user,
                            message=f"Leave request for {leave_req.user.get_full_name() or leave_req.user.username} was approved by HR in bulk and requires Admin approval."
                        )
                messages.success(request, f"Successfully verified and forwarded {count} request(s) to Admin.")
                
            elif action == 'reject':
                reason = request.POST.get('bulk_remarks', 'Bulk rejected by HR')
                for leave_req in requests_qs:
                    leave_req.status = 'REJECTED'
                    leave_req.hr_approved_by = request.user
                    leave_req.hr_approved_at = timezone.now()
                    leave_req.rejection_reason = reason
                    leave_req.admin_remarks = reason
                    leave_req.save()
                    
                    Notification.objects.create(
                        user=leave_req.user,
                        message=f"Your request for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date}) was REJECTED by HR."
                    )
                messages.warning(request, f"Rejected {count} leave request(s).")
        else:
            messages.error(request, "No pending requests were selected for bulk action.")
            
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('hr_dashboard')


@login_required
def hr_employees(request):
    if not is_hr_or_admin(request.user):
        return redirect('employee_dashboard')

    query = request.GET.get('q', '').strip()
    department_filter = request.GET.get('department', '').strip()
    designation_filter = request.GET.get('designation', '').strip()
    status_filter = request.GET.get('status', '').strip()
    page_number = request.GET.get('page', 1)

    employees = User.objects.filter(role='EMPLOYEE').order_by('first_name', 'last_name', 'username')

    if query:
        employees = employees.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(department__icontains=query) |
            Q(designation__icontains=query) |
            Q(phone__icontains=query)
        )

    if department_filter:
        employees = employees.filter(department__iexact=department_filter)

    if designation_filter:
        employees = employees.filter(designation__iexact=designation_filter)

    if status_filter == 'active':
        employees = employees.filter(is_active=True)
    elif status_filter == 'inactive':
        employees = employees.filter(is_active=False)

    employees = employees.prefetch_related('balances__leave_type')

    all_employees = User.objects.filter(role='EMPLOYEE')
    departments = all_employees.exclude(department__isnull=True).exclude(department='').values_list('department', flat=True).distinct().order_by('department')
    designations = all_employees.exclude(designation__isnull=True).exclude(designation='').values_list('designation', flat=True).distinct().order_by('designation')

    paginator = Paginator(employees, 10)
    try:
        page_obj = paginator.page(page_number)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)

    context = {
        'page_obj': page_obj,
        'employees': page_obj.object_list,
        'total_count': paginator.count,
        'query': query,
        'department_filter': department_filter,
        'designation_filter': designation_filter,
        'status_filter': status_filter,
        'departments': departments,
        'designations': designations,
    }
    return render(request, 'hr/employees.html', context)


@login_required
def hr_employee_detail(request, pk):
    if not is_hr_or_admin(request.user):
        return redirect('employee_dashboard')

    employee = get_object_or_404(User, pk=pk, role='EMPLOYEE')
    balances = LeaveBalance.objects.filter(user=employee).select_related('leave_type')
    requests = LeaveRequest.objects.filter(user=employee).select_related('leave_type', 'hr_approved_by', 'admin_approved_by').order_by('-applied_on')

    attendances = Attendance.objects.filter(user=employee)
    total_attendance_days = attendances.count()
    present_days = attendances.filter(status='PRESENT').count()
    half_days = attendances.filter(status='HALF_DAY').count()
    absent_days = attendances.filter(status='ABSENT').count()

    context = {
        'employee': employee,
        'balances': balances,
        'requests': requests,
        'attendance_stats': {
            'total': total_attendance_days,
            'present': present_days,
            'half_day': half_days,
            'absent': absent_days,
        }
    }
    return render(request, 'hr/employee_detail.html', context)



@login_required
def hr_leave_requests(request):
    if not is_hr_or_admin(request.user):
        return redirect('employee_dashboard')
        
    status_filter = request.GET.get('status', 'ALL')
    leave_requests = LeaveRequest.objects.all().select_related('user', 'leave_type', 'hr_approved_by', 'admin_approved_by').prefetch_related('user__balances__leave_type', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')
    
    if status_filter == 'PENDING':
        leave_requests = leave_requests.filter(status__in=['HR_PENDING', 'ADMIN_PENDING'])
    elif status_filter != 'ALL':
        leave_requests = leave_requests.filter(status=status_filter)
        
    team_members = User.objects.filter(is_active=True).order_by('first_name', 'username')

    context = {
        'leave_requests': leave_requests,
        'status_filter': status_filter,
        'team_members': team_members
    }
    return render(request, 'hr/leave_requests.html', context)


@login_required
def hr_approve_reject(request, pk, action):
    if not is_hr_or_admin(request.user):
        return redirect('employee_dashboard')
        
    leave_req = get_object_or_404(LeaveRequest, pk=pk)
    
    if leave_req.status != 'HR_PENDING':
        messages.error(request, "This request is no longer pending HR approval.")
        referer = request.META.get('HTTP_REFERER')
        return redirect(referer) if referer else redirect('hr_dashboard')
        
    remarks = request.POST.get('remarks', '').strip() or request.POST.get('admin_remarks', '').strip()
    
    if action == 'approve':
        leave_req.status = 'ADMIN_PENDING'
        leave_req.hr_approved_by = request.user
        leave_req.hr_approved_at = timezone.now()
        if remarks:
            leave_req.admin_remarks = f"HR Note: {remarks}"
        leave_req.save()
        
        # Trigger Admin AI Approval Agent automatically!
        from .ai_service import evaluate_leave_request_with_ai
        ai_res = evaluate_leave_request_with_ai(leave_req)
        
        if ai_res.get('action') == 'APPROVED':
            messages.success(request, f"Leave request for {leave_req.user.username} approved by HR and automatically APPROVED by Admin AI Agent!")
        else:
            # Notification to Employee
            msg_emp = f"HR approved your {leave_req.leave_type.name} request ({leave_req.start_date} to {leave_req.end_date}). Forwarded to Admin for final approval."
            if remarks:
                msg_emp += f" (HR Note: {remarks})"
            Notification.objects.create(
                user=leave_req.user,
                message=msg_emp
            )
            
            # Notification to Admins
            msg_admin = f"Leave request for {leave_req.user.get_full_name() or leave_req.user.username} ({leave_req.leave_type.name}) was approved by HR and requires your Admin approval."
            if remarks:
                msg_admin += f" HR Note: {remarks}"
            for admin_user in User.objects.filter(role='ADMIN'):
                Notification.objects.create(
                    user=admin_user,
                    message=msg_admin
                )
                
            messages.success(request, f"Leave request for {leave_req.user.username} approved by HR and forwarded to Admin.")
        
    elif action == 'reject':
        leave_req.status = 'REJECTED'
        leave_req.hr_approved_by = request.user
        leave_req.hr_approved_at = timezone.now()
        leave_req.rejection_reason = remarks or 'Rejected by HR'
        leave_req.admin_remarks = remarks or 'Rejected by HR'
        leave_req.save()
        
        # Notification to Employee
        Notification.objects.create(
            user=leave_req.user,
            message=f"Your request for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date}) was REJECTED by HR. Reason: {remarks or 'Not specified'}"
        )
        
        messages.warning(request, f"Leave request for {leave_req.user.username} rejected by HR.")
        
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('hr_dashboard')

# ===================================================
# ADMIN DASHBOARD & WORKFLOW VIEWS
# ===================================================
@login_required
def admin_dashboard(request):
    if not is_admin(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('employee_dashboard')
        
    today = timezone.now().date()
    
    # Counts
    total_employees = User.objects.filter(role='EMPLOYEE').count()
    pending_admin_count = LeaveRequest.objects.filter(status='ADMIN_PENDING').count()
    pending_hr_count = LeaveRequest.objects.filter(status='HR_PENDING').count()
    approved_count = LeaveRequest.objects.filter(status='APPROVED').count()
    rejected_count = LeaveRequest.objects.filter(status='REJECTED').count()
    
    # Employees on leave today
    on_leave_today = LeaveRequest.objects.filter(
        status='APPROVED',
        start_date__lte=today,
        end_date__gte=today
    ).select_related('user', 'leave_type')
    
    # Actionable pending requests list (ADMIN_PENDING)
    pending_requests = LeaveRequest.objects.filter(status='ADMIN_PENDING').select_related('user', 'leave_type', 'hr_approved_by').prefetch_related('user__balances__leave_type', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')
    team_members = User.objects.filter(is_active=True).order_by('first_name', 'username')
    
    context = {
        'stats': {
            'total_employees': total_employees,
            'pending': pending_admin_count,
            'hr_pending': pending_hr_count,
            'approved': approved_count,
            'rejected': rejected_count,
            'on_leave_today': on_leave_today.count()
        },
        'on_leave_today': on_leave_today,
        'pending_requests': pending_requests,
        'team_members': team_members
    }
    return render(request, 'admin/dashboard.html', context)


@login_required
def admin_leave_requests(request):
    if not is_admin(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('employee_dashboard')
        
    status_filter = request.GET.get('status', 'ALL')
    leave_requests = LeaveRequest.objects.all().select_related('user', 'leave_type', 'hr_approved_by', 'admin_approved_by').prefetch_related('user__balances__leave_type', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')
    
    if status_filter == 'PENDING':
        leave_requests = leave_requests.filter(status__in=['HR_PENDING', 'ADMIN_PENDING'])
    elif status_filter != 'ALL':
        leave_requests = leave_requests.filter(status=status_filter)
        
    team_members = User.objects.filter(is_active=True).order_by('first_name', 'username')

    context = {
        'leave_requests': leave_requests,
        'status_filter': status_filter,
        'team_members': team_members
    }
    return render(request, 'admin/leave_requests.html', context)


@login_required
def admin_approve_reject(request, pk, action):
    if not is_admin(request.user):
        if is_hr(request.user):
            return redirect('hr_dashboard')
        return redirect('employee_dashboard')
        
    leave_req = get_object_or_404(LeaveRequest, pk=pk)
    
    if leave_req.status not in ['ADMIN_PENDING', 'HR_PENDING']:
        messages.error(request, "This request has already been processed.")
        return redirect('admin_dashboard')
        
    remarks = request.POST.get('admin_remarks', '').strip() or request.POST.get('remarks', '').strip()
    
    if action == 'approve':
        # Check leave balance first
        try:
            balance = LeaveBalance.objects.get(user=leave_req.user, leave_type=leave_req.leave_type)
            duration = leave_req.duration
            if duration > balance.remaining:
                messages.error(request, f"Employee has insufficient balance ({balance.remaining} days) for this {leave_req.leave_type.name} request ({duration} days).")
                return redirect('admin_dashboard')
                
            # Deduct balance
            balance.used += duration
            balance.save()
            
            leave_req.status = 'APPROVED'
            leave_req.admin_approved_by = request.user
            leave_req.admin_approved_at = timezone.now()
            if remarks:
                leave_req.admin_remarks = remarks
            leave_req.save()
            
            # Notification to Employee
            Notification.objects.create(
                user=leave_req.user,
                message=f"Your request for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date}) was APPROVED by Admin."
            )

            # Notification to HR users
            for hr_user in User.objects.filter(role='HR'):
                Notification.objects.create(
                    user=hr_user,
                    message=f"Leave request for {leave_req.user.get_full_name() or leave_req.user.username} ({leave_req.leave_type.name}) was fully APPROVED by Admin."
                )
            
            messages.success(request, f"Leave request for {leave_req.user.username} approved.")
        except LeaveBalance.DoesNotExist:
            messages.error(request, "Employee does not have a leave balance for this leave type.")
            
    elif action == 'reject':
        leave_req.status = 'REJECTED'
        leave_req.admin_approved_by = request.user
        leave_req.admin_approved_at = timezone.now()
        leave_req.rejection_reason = remarks or 'Rejected by Admin'
        leave_req.admin_remarks = remarks
        leave_req.save()
        
        # Notification to Employee
        Notification.objects.create(
            user=leave_req.user,
            message=f"Your request for {leave_req.leave_type.name} ({leave_req.start_date} to {leave_req.end_date}) was REJECTED by Admin. Reason: {remarks or 'Not specified'}"
        )

        # Notification to HR users
        for hr_user in User.objects.filter(role='HR'):
            Notification.objects.create(
                user=hr_user,
                message=f"Leave request for {leave_req.user.get_full_name() or leave_req.user.username} ({leave_req.leave_type.name}) was REJECTED by Admin."
            )
        
        messages.warning(request, f"Leave request for {leave_req.user.username} rejected by Admin.")
        
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('admin_dashboard')

@login_required
def admin_employees(request):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
        
    employees = User.objects.filter(role='EMPLOYEE').order_by('username')
    return render(request, 'admin/employees.html', {'employees': employees})

@login_required
def admin_employee_detail(request, pk):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
        
    employee = get_object_or_404(User, pk=pk, role='EMPLOYEE')
    balances = LeaveBalance.objects.filter(user=employee).select_related('leave_type')
    requests = LeaveRequest.objects.filter(user=employee).order_by('-applied_on')
    
    if request.method == 'POST' and 'update_balance' in request.POST:
        balance_id = request.POST.get('balance_id')
        new_allocated = request.POST.get('allocated')
        try:
            balance = LeaveBalance.objects.get(pk=balance_id, user=employee)
            balance.allocated = int(new_allocated)
            balance.save()  # remaining will auto-recalculate
            messages.success(request, f"Leave balance updated for {balance.leave_type.name}.")
            return redirect('admin_employee_detail', pk=pk)
        except Exception as e:
            messages.error(request, f"Error updating balance: {str(e)}")
            
    context = {
        'employee': employee,
        'balances': balances,
        'requests': requests
    }
    return render(request, 'admin/employee_detail.html', context)

@login_required
def admin_leave_types(request):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
        
    leave_types = LeaveType.objects.all()
    
    if request.method == 'POST':
        form = LeaveTypeForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Leave type added successfully!")
            return redirect('admin_leave_types')
    else:
        form = LeaveTypeForm()
        
    return render(request, 'admin/leave_types.html', {'leave_types': leave_types, 'form': form})

@login_required
def admin_leave_type_delete(request, pk):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
    if request.method == 'POST':
        lt = get_object_or_404(LeaveType, pk=pk)
        lt.delete()
        messages.success(request, "Leave type deleted successfully.")
    return redirect('admin_leave_types')

@login_required
def admin_holidays(request):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
        
    holidays = Holiday.objects.all().order_by('date')
    
    if request.method == 'POST':
        form = HolidayForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Holiday added successfully!")
            return redirect('admin_holidays')
    else:
        form = HolidayForm()
        
    return render(request, 'admin/holidays.html', {'holidays': holidays, 'form': form})

@login_required
def admin_holiday_delete(request, pk):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
    if request.method == 'POST':
        h = get_object_or_404(Holiday, pk=pk)
        h.delete()
        messages.success(request, "Holiday deleted successfully.")
    return redirect('admin_holidays')


@login_required
def admin_ai_agents(request):
    if not is_admin(request.user):
        return redirect('employee_dashboard')

    if request.method == 'POST':
        form = AIAgentConfigForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'AI agent configuration saved. Add the API key to your server environment before using it.')
            return redirect('admin_ai_agents')
    else:
        form = AIAgentConfigForm()

    return render(request, 'admin/ai_agents.html', {
        'agents': AIAgentConfig.objects.all(),
        'form': form,
    })


@login_required
def admin_ai_agent_delete(request, pk):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
    if request.method != 'POST':
        return HttpResponseForbidden('Deletion requires a POST request.')

    agent = get_object_or_404(AIAgentConfig, pk=pk)
    agent.delete()
    messages.success(request, 'AI agent configuration deleted.')
    return redirect('admin_ai_agents')

@login_required
def admin_run_ai_agent(request):
    if not is_admin(request.user):
        return redirect('employee_dashboard')
    from .ai_service import process_all_pending_admin_leaves
    results = process_all_pending_admin_leaves()
    approved_count = sum(1 for r in results if r['result'].get('action') == 'APPROVED')
    flagged_count = sum(1 for r in results if r['result'].get('action') == 'FLAGGED')
    halted_count = sum(1 for r in results if r['result'].get('action') == 'HALT')
    
    msg = f"AI Agent Batch Process Complete: {approved_count} auto-approved, {flagged_count} flagged for manual review."
    if halted_count:
        msg += f" ({halted_count} non-Admin requests halted according to System Constraints)."
    messages.success(request, msg)
    referer = request.META.get('HTTP_REFERER')
    return redirect(referer) if referer else redirect('admin_dashboard')

@login_required
def calendar_view(request):
    return render(request, 'calendar.html')

@login_required
def calendar_data_api(request):
    events = []
    
    # 1. Get Holidays
    holidays = Holiday.objects.all()
    for h in holidays:
        events.append({
            'title': f"Holiday: {h.name}",
            'start': h.date.isoformat(),
            'backgroundColor': '#eab308', # Yellow
            'borderColor': '#eab308',
            'allDay': True,
            'extendedProps': {'description': h.description or ''}
        })
        
    # 2. Get Leave requests
    if request.user.role == 'ADMIN':
        leaves = LeaveRequest.objects.filter(status='APPROVED').select_related('user', 'leave_type')
        for l in leaves:
            events.append({
                'title': f"{l.user.get_full_name() or l.user.username} - {l.leave_type.name}",
                'start': l.start_date.isoformat(),
                # FullCalendar end date is exclusive for allDay, so we add 1 day to make it look right on month view
                'end': (l.end_date + timezone.timedelta(days=1)).isoformat(),
                'backgroundColor': l.leave_type.color_code,
                'borderColor': l.leave_type.color_code,
                'allDay': True,
                'extendedProps': {'reason': l.reason}
            })
    else:
        # Employees see their own leaves with details
        own_leaves = LeaveRequest.objects.filter(user=request.user).select_related('leave_type')
        for l in own_leaves:
            # Color by status
            color = '#3b82f6' # pending (blue)
            if l.status == 'APPROVED':
                color = l.leave_type.color_code
            elif l.status == 'REJECTED':
                color = '#ef4444' # red
            elif l.status == 'CANCELLED':
                color = '#6b7280' # gray
                
            events.append({
                'title': f"My Leave: {l.leave_type.name} ({l.get_status_display()})",
                'start': l.start_date.isoformat(),
                'end': (l.end_date + timezone.timedelta(days=1)).isoformat(),
                'backgroundColor': color,
                'borderColor': color,
                'allDay': True,
                'extendedProps': {'reason': l.reason, 'status': l.status}
            })
            
        # Optional: show other colleagues on leave as "On Leave (Anonymous)"
        colleagues_leaves = LeaveRequest.objects.filter(status='APPROVED').exclude(user=request.user).select_related('leave_type')
        for l in colleagues_leaves:
            events.append({
                'title': "Colleague on Leave",
                'start': l.start_date.isoformat(),
                'end': (l.end_date + timezone.timedelta(days=1)).isoformat(),
                'backgroundColor': '#4b5563', # Dark slate gray
                'borderColor': '#4b5563',
                'allDay': True
            })
            
    return JsonResponse(events, safe=False)

@login_required
def chart_data_api(request):
    if not is_admin(request.user):
        return HttpResponseForbidden()
        
    # Data 1: Leave distribution (Pie Chart)
    # Count of APPROVED leave requests by type
    distribution = LeaveRequest.objects.filter(status='APPROVED').values('leave_type__name', 'leave_type__color_code').annotate(count=Count('id'))
    labels = [item['leave_type__name'] for item in distribution]
    colors = [item['leave_type__color_code'] for item in distribution]
    counts = [item['count'] for item in distribution]
    
    # Data 2: Monthly trend (Bar Chart)
    # Count of leave requests per month in the current year
    current_year = timezone.now().year
    monthly_data = []
    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    for month in range(1, 13):
        count = LeaveRequest.objects.filter(
            start_date__year=current_year,
            start_date__month=month
        ).count()
        monthly_data.append(count)
        
    return JsonResponse({
        'distribution': {
            'labels': labels,
            'colors': colors,
            'counts': counts
        },
        'trends': {
            'labels': month_labels,
            'counts': monthly_data
        }
    })

@login_required
def mark_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', ''):
        return JsonResponse({'status': 'success', 'unread_count': 0, 'message': 'All notifications marked as read.'})
        
    messages.success(request, "All notifications marked as read.")
    referer = request.META.get('HTTP_REFERER')
    if referer and (referer.startswith('/') or referer.startswith('http://') or referer.startswith('https://')):
        return redirect(referer)
    next_url = request.GET.get('next', 'dashboard')
    if not next_url.startswith('/'):
        next_url = 'dashboard'
    return redirect(next_url)

def reassign_modal_demo(request):
    import os
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'demo_modal.html')
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse("Demo modal file not found", status=404)

def detailed_offcanvas_demo(request):
    import os
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'demo_offcanvas.html')
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse("Offcanvas demo file not found", status=404)


@login_required
def attendance_dashboard(request):
    now = timezone.now()
    current_year = now.year
    current_month = now.month
    today_date = now.date()

    # User's attendance for current month
    user_attendances = Attendance.objects.filter(
        user=request.user,
        date__year=current_year,
        date__month=current_month
    ).order_by('-date')

    present_days_count = user_attendances.filter(status='PRESENT').count()
    half_days_count = user_attendances.filter(status='HALF_DAY').count()
    absent_days_count = user_attendances.filter(status='ABSENT').count()
    
    total_worked_records = present_days_count + half_days_count
    total_hours_sum = user_attendances.aggregate(s=Sum('total_hours'))['s'] or Decimal('0.00')
    avg_daily_hours = round(float(total_hours_sum) / total_worked_records, 1) if total_worked_records > 0 else 0.0

    # Overtime / Deficit hours: difference from standard 8.0h per worked day
    overtime_deficit = Decimal('0.00')
    for att in user_attendances:
        if att.check_in and att.check_out:
            overtime_deficit += (att.total_hours - Decimal('8.00'))
    overtime_deficit_val = round(float(overtime_deficit), 1)

    # Today's attendance for logged in user
    today_att = Attendance.objects.filter(user=request.user, date=today_date).first()
    is_checked_in = bool(today_att and today_att.check_in)
    is_checked_out = bool(today_att and today_att.check_out)

    # Live availability: Currently active employees (checked in today but not checked out)
    active_employees_att = Attendance.objects.filter(
        date=today_date,
        check_in__isnull=False,
        check_out__isnull=True
    ).select_related('user').order_by('-check_in')

    checked_out_count = Attendance.objects.filter(date=today_date, check_out__isnull=False).count()
    total_employees_count = User.objects.filter(is_active=True).count()

    context = {
        'attendances': user_attendances,
        'present_days_count': present_days_count,
        'half_days_count': half_days_count,
        'absent_days_count': absent_days_count,
        'avg_daily_hours': avg_daily_hours,
        'overtime_deficit_val': overtime_deficit_val,
        'today_att': today_att,
        'is_checked_in': is_checked_in,
        'is_checked_out': is_checked_out,
        'active_employees_att': active_employees_att,
        'active_count': active_employees_att.count(),
        'checked_out_count': checked_out_count,
        'total_employees_count': total_employees_count,
        'current_month_name': now.strftime('%B %Y'),
        'today_date_str': now.strftime('%A, %B %d, %Y'),
    }
    return render(request, 'attendance/dashboard.html', context)


@login_required
def api_check_in(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method.'}, status=405)

    now = timezone.now()
    today_date = now.date()
    current_time = now.time()

    attendance, created = Attendance.objects.get_or_create(
        user=request.user,
        date=today_date,
        defaults={'check_in': current_time, 'status': 'PRESENT'}
    )

    if not created and attendance.check_in:
        return JsonResponse({
            'status': 'error',
            'message': f'You already checked in today at {attendance.check_in.strftime("%I:%M %p")}.'
        }, status=400)

    if not created:
        attendance.check_in = current_time
        attendance.status = 'PRESENT'
        attendance.save()

    return JsonResponse({
        'status': 'success',
        'message': f'Successfully checked in at {current_time.strftime("%I:%M %p")}.',
        'check_in': current_time.strftime('%I:%M %p'),
        'date': today_date.strftime('%b %d, %Y'),
        'status_display': attendance.get_status_display(),
    })


@login_required
def api_check_out(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method.'}, status=405)

    now = timezone.now()
    today_date = now.date()
    current_time = now.time()

    attendance = Attendance.objects.filter(user=request.user, date=today_date).first()

    if not attendance or not attendance.check_in:
        return JsonResponse({
            'status': 'error',
            'message': 'You must check in first before checking out.'
        }, status=400)

    if attendance.check_out:
        return JsonResponse({
            'status': 'error',
            'message': f'You already checked out today at {attendance.check_out.strftime("%I:%M %p")}.'
        }, status=400)

    attendance.check_out = current_time
    attendance.save()  # Triggers save() logic for total_hours & status!

    # Recalculate monthly metrics for response
    current_year = now.year
    current_month = now.month
    user_attendances = Attendance.objects.filter(
        user=request.user,
        date__year=current_year,
        date__month=current_month
    )
    present_days_count = user_attendances.filter(status='PRESENT').count()
    total_worked_records = present_days_count + user_attendances.filter(status='HALF_DAY').count()
    total_hours_sum = user_attendances.aggregate(s=Sum('total_hours'))['s'] or Decimal('0.00')
    avg_daily_hours = round(float(total_hours_sum) / total_worked_records, 1) if total_worked_records > 0 else 0.0

    overtime_deficit = Decimal('0.00')
    for att in user_attendances:
        if att.check_in and att.check_out:
            overtime_deficit += (att.total_hours - Decimal('8.00'))

    return JsonResponse({
        'status': 'success',
        'message': f'Successfully checked out at {current_time.strftime("%I:%M %p")}. Shift completed: {attendance.total_hours} hrs.',
        'check_out': current_time.strftime('%I:%M %p'),
        'total_hours': str(attendance.total_hours),
        'attendance_status': attendance.status,
        'status_display': attendance.get_status_display(),
        'metrics': {
            'present_days': present_days_count,
            'avg_hours': avg_daily_hours,
            'overtime_deficit': round(float(overtime_deficit), 1),
        }
    })


@login_required
def api_attendance_metrics(request):
    now = timezone.now()
    today_date = now.date()
    current_year = now.year
    current_month = now.month

    user_attendances = Attendance.objects.filter(
        user=request.user,
        date__year=current_year,
        date__month=current_month
    )
    present_days_count = user_attendances.filter(status='PRESENT').count()
    half_days_count = user_attendances.filter(status='HALF_DAY').count()
    absent_days_count = user_attendances.filter(status='ABSENT').count()
    
    total_worked_records = present_days_count + half_days_count
    total_hours_sum = user_attendances.aggregate(s=Sum('total_hours'))['s'] or Decimal('0.00')
    avg_daily_hours = round(float(total_hours_sum) / total_worked_records, 1) if total_worked_records > 0 else 0.0

    overtime_deficit = Decimal('0.00')
    for att in user_attendances:
        if att.check_in and att.check_out:
            overtime_deficit += (att.total_hours - Decimal('8.00'))

    active_count = Attendance.objects.filter(date=today_date, check_in__isnull=False, check_out__isnull=True).count()

    return JsonResponse({
        'status': 'success',
        'present_days': present_days_count,
        'half_days': half_days_count,
        'absent_days': absent_days_count,
        'avg_daily_hours': avg_daily_hours,
        'overtime_deficit': round(float(overtime_deficit), 1),
        'active_count': active_count,
    })


@login_required
@require_POST
def generate_leave_reason(request):
    """
    API view to generate AI leave reason based on POST parameters leave_type and keywords.
    Returns clean JSON response.
    """
    from .ai_service import generate_ai_leave_reason

    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body.decode('utf-8'))
            leave_type = data.get('leave_type', '')
            keywords = data.get('keywords', '')
        else:
            leave_type = request.POST.get('leave_type', '')
            keywords = request.POST.get('keywords', '')

        if not leave_type and not keywords:
            return JsonResponse({'success': False, 'error': 'Please provide leave type or keywords.'}, status=400)

        reason = generate_ai_leave_reason(leave_type_name=leave_type, keywords=keywords)
        return JsonResponse({'success': True, 'reason': reason})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)





