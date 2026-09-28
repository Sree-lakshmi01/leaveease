from rest_framework import serializers
from accounts.models import User
from .models import LeaveType, LeaveBalance, LeaveRequest, AIAuditLog, TaskReassignment, Notification

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'role', 'department', 'designation', 'profile_pic']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'description', 'allocated_days', 'color_code']


class AIAuditLogSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()


    class Meta:
        model = AIAuditLog
        fields = ['id', 'leave_request', 'action', 'confidence_score', 'extracted_reason', 'document_verified', 'details', 'created_at', 'created_at_formatted']

    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime('%b %d, %Y %H:%M')


class TaskReassignmentSerializer(serializers.ModelSerializer):
    original_owner_name = serializers.ReadOnlyField(source='original_owner.get_full_name')
    reassigned_to_name = serializers.ReadOnlyField(source='reassigned_to.get_full_name')

    class Meta:
        model = TaskReassignment
        fields = [
            'id', 'leave_request', 'original_owner', 'original_owner_name', 
            'reassigned_to', 'reassigned_to_name', 'task_title', 'notes', 'status', 'created_at'
        ]


class LeaveRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    leave_type = LeaveTypeSerializer(read_only=True)
    leave_type_id = serializers.PrimaryKeyRelatedField(queryset=LeaveType.objects.all(), source='leave_type', write_only=True)
    duration = serializers.ReadOnlyField()
    hr_approved_by_name = serializers.ReadOnlyField(source='hr_approved_by.get_full_name')
    admin_approved_by_name = serializers.ReadOnlyField(source='admin_approved_by.get_full_name')
    ai_audit_logs = AIAuditLogSerializer(many=True, read_only=True)
    task_reassignments = TaskReassignmentSerializer(many=True, read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'user', 'leave_type', 'leave_type_id', 'start_date', 'end_date',
            'duration', 'reason', 'medical_certificate', 'status', 'admin_remarks',
            'hr_approved_by', 'hr_approved_by_name', 'hr_approved_at',
            'admin_approved_by', 'admin_approved_by_name', 'admin_approved_at',
            'rejection_reason', 'applied_on', 'updated_on',
            'ai_audit_logs', 'task_reassignments'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'admin_remarks', 'hr_approved_by', 'hr_approved_at',
            'admin_approved_by', 'admin_approved_at', 'rejection_reason', 'applied_on', 'updated_on'
        ]


class KanbanStatusMoveSerializer(serializers.Serializer):
    target_status = serializers.ChoiceField(choices=['HR_PENDING', 'ADMIN_PENDING', 'APPROVED', 'REJECTED'])
    remarks = serializers.CharField(required=False, allow_blank=True)
