from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .api_views import LeaveRequestViewSet

router = DefaultRouter()
router.register(r'leave-requests', LeaveRequestViewSet, basename='api_leave_requests')

urlpatterns = [
    path('api/v1/', include(router.urls)),
    path('dashboard/', views.dashboard_redirect, name='dashboard'),

    path('employee/dashboard/', views.employee_dashboard, name='employee_dashboard'),
    path('employee/apply-leave/', views.apply_leave_view, name='apply_leave'),
    path('employee/leave-history/', views.leave_history_view, name='leave_history'),
    path('employee/leave-request/<int:pk>/cancel/', views.cancel_leave_view, name='cancel_leave'),
    
    path('hr/dashboard/', views.hr_dashboard, name='hr_dashboard'),
    path('hr/leave-requests/', views.hr_leave_requests, name='hr_leave_requests'),
    path('hr/leave-request/<int:pk>/<str:action>/', views.hr_approve_reject, name='hr_approve_reject'),
    path('hr/bulk-action/', views.hr_bulk_approve, name='hr_bulk_approve'),
    path('hr/employees/', views.hr_employees, name='hr_employees'),
    path('hr/employees/<int:pk>/', views.hr_employee_detail, name='hr_employee_detail'),
    
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/leave-requests/', views.admin_leave_requests, name='admin_leave_requests'),
    path('admin/leave-request/<int:pk>/<str:action>/', views.admin_approve_reject, name='admin_approve_reject'),
    path('admin/employees/', views.admin_employees, name='admin_employees'),
    path('admin/employees/<int:pk>/', views.admin_employee_detail, name='admin_employee_detail'),
    path('admin/leave-types/', views.admin_leave_types, name='admin_leave_types'),
    path('admin/leave-types/<int:pk>/delete/', views.admin_leave_type_delete, name='admin_leave_type_delete'),
    path('admin/holidays/', views.admin_holidays, name='admin_holidays'),
    path('admin/holidays/<int:pk>/delete/', views.admin_holiday_delete, name='admin_holiday_delete'),
    path('admin/ai-agents/', views.admin_ai_agents, name='admin_ai_agents'),
    path('admin/ai-agents/<int:pk>/delete/', views.admin_ai_agent_delete, name='admin_ai_agent_delete'),
    path('admin/run-ai-agent/', views.admin_run_ai_agent, name='admin_run_ai_agent'),
    
    path('calendar/', views.calendar_view, name='calendar'),
    path('attendance/', views.attendance_dashboard, name='attendance_dashboard'),
    path('attendance/api/check-in/', views.api_check_in, name='api_check_in'),
    path('attendance/api/check-out/', views.api_check_out, name='api_check_out'),
    path('attendance/api/metrics/', views.api_attendance_metrics, name='api_attendance_metrics'),
    path('api/calendar/', views.calendar_data_api, name='calendar_data_api'),
    path('api/charts/', views.chart_data_api, name='chart_data_api'),
    path('api/generate-leave-reason/', views.generate_leave_reason, name='generate_leave_reason'),
    path('notifications/mark-read/', views.mark_notifications_read, name='mark_notifications_read'),
    path('reassign-modal-demo/', views.reassign_modal_demo, name='reassign_modal_demo'),
    path('detailed-offcanvas-demo/', views.detailed_offcanvas_demo, name='detailed_offcanvas_demo'),
]


