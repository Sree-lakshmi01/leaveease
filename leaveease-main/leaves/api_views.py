from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q
from accounts.models import User
from .models import LeaveRequest, LeaveType, LeaveBalance, AIAuditLog, TaskReassignment, Notification
from .serializers import (
    LeaveRequestSerializer, LeaveTypeSerializer, UserSerializer,
    AIAuditLogSerializer, TaskReassignmentSerializer, KanbanStatusMoveSerializer
)
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class IsHROrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['HR', 'ADMIN']


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['HR', 'ADMIN']:
            return LeaveRequest.objects.all().select_related('user', 'leave_type', 'hr_approved_by', 'admin_approved_by').prefetch_related('ai_audit_logs', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')
        return LeaveRequest.objects.filter(user=user).select_related('user', 'leave_type', 'hr_approved_by', 'admin_approved_by').prefetch_related('ai_audit_logs', 'task_reassignments__reassigned_to', 'task_reassignments__original_owner').order_by('-applied_on')

    def perform_create(self, serializer):
        leave_req = serializer.save(user=self.request.user, status='HR_PENDING')
        
        # Broadcast WebSocket notification
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'activity_feed',
                {
                    'type': 'broadcast_activity',
                    'event': 'LEAVE_SUBMITTED',
                    'request_id': leave_req.id,
                    'user_name': leave_req.user.get_full_name() or leave_req.user.username,
                    'leave_type': leave_req.leave_type.name,
                    'status': leave_req.status,
                    'timestamp': timezone.now().isoformat()
                }
            )

    @action(detail=True, methods=['post'], permission_classes=[IsHROrAdmin])
    def move_status(self, request, pk=None):
        """
        Kanban Drag and Drop Endpoint for transitioning leave request statuses.
        """
        leave_req = self.get_object()
        serializer = KanbanStatusMoveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        target_status = serializer.validated_data['target_status']
        remarks = serializer.validated_data.get('remarks', '')

        with transaction.atomic():
            if target_status == 'ADMIN_PENDING':
                if request.user.role not in ['HR', 'ADMIN']:
                    return Response({'error': 'HR permission required for screening.'}, status=status.HTTP_403_FORBIDDEN)
                leave_req.status = 'ADMIN_PENDING'
                leave_req.hr_approved_by = request.user
                leave_req.hr_approved_at = timezone.now()
                if remarks:
                    leave_req.admin_remarks = f"HR Note: {remarks}"
                leave_req.save()

                # Trigger AI evaluation if available
                from .ai_service import evaluate_leave_request_with_ai
                ai_res = evaluate_leave_request_with_ai(leave_req)
                
                # Log AI action
                AIAuditLog.objects.create(
                    leave_request=leave_req,
                    action='AUTO_APPROVED' if ai_res.get('action') == 'APPROVED' else 'FLAGGED',
                    confidence_score=0.95 if ai_res.get('action') == 'APPROVED' else 0.65,
                    extracted_reason=ai_res.get('reason', ''),
                    document_verified=bool(leave_req.medical_certificate),
                    details=ai_res
                )

            elif target_status == 'APPROVED':
                if request.user.role != 'ADMIN':
                    return Response({'error': 'Only Admin can give final approval.'}, status=status.HTTP_403_FORBIDDEN)
                
                # Balance check
                try:
                    balance = LeaveBalance.objects.get(user=leave_req.user, leave_type=leave_req.leave_type)
                    if leave_req.duration > balance.remaining:
                        return Response({'error': f'Insufficient balance ({balance.remaining} days remaining).'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    balance.used += leave_req.duration
                    balance.save()
                except LeaveBalance.DoesNotExist:
                    return Response({'error': 'Leave balance record missing.'}, status=status.HTTP_400_BAD_REQUEST)

                leave_req.status = 'APPROVED'
                leave_req.admin_approved_by = request.user
                leave_req.admin_approved_at = timezone.now()
                if remarks:
                    leave_req.admin_remarks = remarks
                leave_req.save()

            elif target_status == 'REJECTED':
                leave_req.status = 'REJECTED'
                leave_req.rejection_reason = remarks or 'Rejected during workflow review.'
                leave_req.admin_remarks = remarks
                leave_req.save()

        # Broadcast real-time WebSocket update
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'activity_feed',
                {
                    'type': 'broadcast_activity',
                    'event': 'STATUS_MOVED',
                    'request_id': leave_req.id,
                    'user_name': leave_req.user.get_full_name() or leave_req.user.username,
                    'target_status': target_status,
                    'updated_by': request.user.username,
                    'timestamp': timezone.now().isoformat()
                }
            )

        return Response(LeaveRequestSerializer(leave_req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsHROrAdmin])
    def reassign_task(self, request, pk=None):
        """
        Off-canvas drawer task reassignment API endpoint.
        """
        leave_req = self.get_object()
        target_user_id = request.data.get('reassigned_to_id')
        task_title = request.data.get('task_title', 'General Handover')
        notes = request.data.get('notes', '')

        if not target_user_id:
            return Response({'error': 'Target team member ID required.'}, status=status.HTTP_400_BAD_REQUEST)

        reassigned_to = User.objects.get(pk=target_user_id)
        reassignment = TaskReassignment.objects.create(
            leave_request=leave_req,
            original_owner=leave_req.user,
            reassigned_to=reassigned_to,
            task_title=task_title,
            notes=notes
        )

        return Response(TaskReassignmentSerializer(reassignment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsHROrAdmin])
    def analytics(self, request):
        """
        Analytics endpoint for Recharts review velocity and leave distribution graphs.
        """
        # Review velocity data (last 7 days breakdown)
        today = timezone.now().date()
        velocity_data = []
        for i in range(6, -1, -1):
            day_date = today - timezone.timedelta(days=i)
            approved = LeaveRequest.objects.filter(status='APPROVED', updated_on__date=day_date).count()
            rejected = LeaveRequest.objects.filter(status='REJECTED', updated_on__date=day_date).count()
            submitted = LeaveRequest.objects.filter(applied_on__date=day_date).count()
            velocity_data.append({
                'day': day_date.strftime('%a %b %d'),
                'submitted': submitted,
                'approved': approved,
                'rejected': rejected
            })

        # Leave type distribution
        distribution = list(
            LeaveRequest.objects.values('leave_type__name', 'leave_type__color_code')
            .annotate(value=Count('id'))
            .order_by('-value')
        )

        # Status summary breakdown
        status_summary = {
            'hr_pending': LeaveRequest.objects.filter(status='HR_PENDING').count(),
            'admin_pending': LeaveRequest.objects.filter(status='ADMIN_PENDING').count(),
            'approved': LeaveRequest.objects.filter(status='APPROVED').count(),
            'rejected': LeaveRequest.objects.filter(status='REJECTED').count()
        }

        return Response({
            'review_velocity': velocity_data,
            'leave_distribution': distribution,
            'status_summary': status_summary
        })
