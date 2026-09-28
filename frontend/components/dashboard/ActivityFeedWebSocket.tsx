"use client";

import React, { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, RefreshCw, Zap, CheckCircle2, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  event: string;
  user_name: string;
  target_status?: string;
  updated_by?: string;
  timestamp: string;
}

interface ActivityFeedWebSocketProps {
  isDarkMode: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onCountersUpdate?: (counters: any) => void;
}

export const ActivityFeedWebSocket: React.FC<ActivityFeedWebSocketProps> = ({
  isDarkMode,
  onConnectionChange,
  onCountersUpdate,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: '1',
      event: 'STATUS_MOVED',
      user_name: 'Sarah Jenkins',
      target_status: 'ADMIN_PENDING',
      updated_by: 'HR Manager',
      timestamp: '2 mins ago',
    },
    {
      id: '2',
      event: 'AI_AUTO_APPROVED',
      user_name: 'Michael Scott',
      target_status: 'APPROVED',
      updated_by: 'Gemini AI Agent',
      timestamp: '5 mins ago',
    },
    {
      id: '3',
      event: 'LEAVE_SUBMITTED',
      user_name: 'David Miller',
      target_status: 'HR_PENDING',
      updated_by: 'Employee',
      timestamp: '12 mins ago',
    },
  ]);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Attempt WebSocket connection to Django Channels ASGI server
    let ws: WebSocket | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/activity/`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        if (onConnectionChange) onConnectionChange(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ACTIVITY_UPDATE') {
            const newItem: ActivityItem = {
              id: Date.now().toString(),
              event: data.event || 'WORKFLOW_UPDATE',
              user_name: data.user_name || 'System User',
              target_status: data.target_status,
              updated_by: data.updated_by || 'System',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setActivities((prev) => [newItem, ...prev.slice(0, 9)]);
            if (data.counters && onCountersUpdate) {
              onCountersUpdate(data.counters);
            }
          } else if (data.counters && onCountersUpdate) {
            onCountersUpdate(data.counters);
          }
        } catch (e) {
          console.error('Error parsing WebSocket frame:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (onConnectionChange) onConnectionChange(false);
      };

      ws.onerror = () => {
        setIsConnected(false);
        if (onConnectionChange) onConnectionChange(false);
      };
    } catch (e) {
      setIsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className={`rounded-2xl p-5 border shadow-sm transition-colors ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Real-Time Activity Stream</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Django Channels & Redis WebSocket feed</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-semibold">
          {isConnected ? (
            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Stream Connected</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Connecting Channel</span>
            </span>
          )}
        </div>
      </div>

      {/* Activity Feed Items */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {activities.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start justify-between text-xs transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800"
          >
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] mt-0.5">
                {item.user_name[0]}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {item.user_name} &bull; <span className="font-normal text-slate-500 dark:text-slate-400">{item.event.replace('_', ' ')}</span>
                </p>
                {item.target_status && (
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Status: {item.target_status}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-400">
              <span>{item.timestamp}</span>
              {item.updated_by && <span className="block text-slate-500 font-medium">{item.updated_by}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
