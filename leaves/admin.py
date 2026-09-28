from django.contrib import admin
from .models import AIAgentConfig, LeaveType, LeaveBalance, LeaveRequest, Holiday, Notification, Attendance

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'check_in', 'check_out', 'total_hours', 'status')
    list_filter = ('status', 'date', 'user__department')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    date_hierarchy = 'date'

@admin.register(AIAgentConfig)
class AIAgentConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'provider', 'model', 'is_enabled', 'is_default', 'updated_at')
    list_filter = ('provider', 'is_enabled', 'is_default')
    search_fields = ('name', 'model')

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'allocated_days', 'color_code')
    search_fields = ('name',)

@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'leave_type', 'allocated', 'used', 'remaining')
    list_filter = ('leave_type', 'user__department')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'leave_type__name')

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'leave_type', 'start_date', 'end_date', 'duration', 'status', 'applied_on')
    list_filter = ('status', 'leave_type', 'start_date')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'reason')
    date_hierarchy = 'start_date'

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'description')
    list_filter = ('date',)
    search_fields = ('name', 'description')
    ordering = ('date',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__username', 'message')

