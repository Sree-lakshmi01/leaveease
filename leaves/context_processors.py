from django.utils import timezone
from .models import Notification, Attendance

def notifications_processor(request):
    if request.user.is_authenticated:
        unread_notifications_count = Notification.objects.filter(user=request.user, is_read=False).count()
        recent_notifications = Notification.objects.filter(user=request.user).order_by('-created_at')[:5]
        return {
            'unread_notifications_count': unread_notifications_count,
            'recent_notifications': recent_notifications
        }
    return {
        'unread_notifications_count': 0,
        'recent_notifications': []
    }

def attendance_processor(request):
    if request.user.is_authenticated:
        today = timezone.now().date()
        att = Attendance.objects.filter(user=request.user, date=today).first()
        return {
            'today_attendance_record': att,
            'user_is_checked_in': bool(att and att.check_in),
            'user_is_checked_out': bool(att and att.check_out),
        }
    return {
        'today_attendance_record': None,
        'user_is_checked_in': False,
        'user_is_checked_out': False,
    }

