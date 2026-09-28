import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async

class ActivityFeedConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        """
        Invoked when client establishes a WebSocket connection to `ws/activity/`.
        """
        self.room_group_name = 'activity_feed'

        # Join activity feed group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send initial connection confirmation & current counters
        counters = await self.get_current_counters()
        await self.send_json({
            'type': 'CONNECTION_ESTABLISHED',
            'message': 'Connected to LeaveEase Real-Time Activity Feed WebSocket.',
            'counters': counters
        })

    async def disconnect(self, close_code):
        """
        Invoked when client leaves the WebSocket connection.
        """
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content):
        """
        Handles incoming WebSocket messages from the client (e.g. heartbeat ping or filter change).
        """
        msg_type = content.get('type')
        if msg_type == 'PING':
            await self.send_json({'type': 'PONG', 'status': 'healthy'})
        elif msg_type == 'FETCH_COUNTERS':
            counters = await self.get_current_counters()
            await self.send_json({'type': 'COUNTER_UPDATE', 'counters': counters})

    async def broadcast_activity(self, event):
        """
        Group handler for receiving activity broadcasts and streaming to connected WebSocket clients.
        """
        counters = await self.get_current_counters()
        await self.send_json({
            'type': 'ACTIVITY_UPDATE',
            'event': event.get('event'),
            'request_id': event.get('request_id'),
            'user_name': event.get('user_name'),
            'target_status': event.get('target_status'),
            'updated_by': event.get('updated_by'),
            'timestamp': event.get('timestamp'),
            'counters': counters
        })

    @sync_to_async
    def get_current_counters(self):
        """
        Queries DB to get real-time pending leave counts.
        """
        from .models import LeaveRequest
        return {
            'hr_pending': LeaveRequest.objects.filter(status='HR_PENDING').count(),
            'admin_pending': LeaveRequest.objects.filter(status='ADMIN_PENDING').count(),
            'approved_total': LeaveRequest.objects.filter(status='APPROVED').count(),
            'rejected_total': LeaveRequest.objects.filter(status='REJECTED').count(),
        }
