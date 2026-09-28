import logging
from django.utils import timezone
from .models import LeaveRequest, AIAuditLog, Notification
from .ai_service import evaluate_leave_request_with_ai
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# Fallback wrapper if Celery is not running in background
try:
    from celery import shared_task
except ImportError:
    def shared_task(func):
        return func


@shared_task
def process_ai_leave_verification_task(leave_request_id):
    """
    Asynchronous Celery task that offloads AI document parsing, Gemini verification,
    and auto-approval logic away from the request-response thread.
    """
    try:
        leave_req = LeaveRequest.objects.select_related('user', 'leave_type').get(pk=leave_request_id)
        logger.info(f"[Celery Worker] Starting AI leave verification task for Request #{leave_request_id}")

        # Run AI evaluation engine
        ai_res = evaluate_leave_request_with_ai(leave_req)

        # Record AI Audit Log entry
        AIAuditLog.objects.create(
            leave_request=leave_req,
            action='AUTO_APPROVED' if ai_res.get('action') == 'APPROVED' else 'FLAGGED',
            confidence_score=0.98 if ai_res.get('action') == 'APPROVED' else 0.60,
            extracted_reason=ai_res.get('reason', ''),
            document_verified=bool(leave_req.medical_certificate),
            details=ai_res
        )

        # Broadcast live update over WebSockets
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'activity_feed',
                {
                    'type': 'broadcast_activity',
                    'event': f"AI_{ai_res.get('action')}",
                    'request_id': leave_req.id,
                    'user_name': leave_req.user.get_full_name() or leave_req.user.username,
                    'target_status': leave_req.status,
                    'updated_by': 'Admin AI Agent (Celery)',
                    'timestamp': timezone.now().isoformat()
                }
            )

        return ai_res
    except LeaveRequest.DoesNotExist:
        logger.error(f"[Celery Worker] Leave request #{leave_request_id} not found.")
        return {'status': 'error', 'message': 'Request not found'}
    except Exception as e:
        logger.error(f"[Celery Worker] Error processing leave verification task: {e}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def broadcast_websocket_event_task(event_name, payload):
    """
    Asynchronous Celery task to push real-time updates to WebSocket channels.
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            'activity_feed',
            {
                'type': 'broadcast_activity',
                'event': event_name,
                'payload': payload,
                'timestamp': timezone.now().isoformat()
            }
        )
