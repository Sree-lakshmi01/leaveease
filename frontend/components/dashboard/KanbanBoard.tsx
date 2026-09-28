"use client";

import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Bot, 
  ChevronRight, 
  AlertCircle, 
  MoreVertical,
  User,
  ArrowRight
} from 'lucide-react';
import { LeaveRequestDetail } from './AuditOffcanvasDrawer';

interface KanbanBoardProps {
  leaveRequests: LeaveRequestDetail[];
  onMoveStatus: (requestId: number, targetStatus: 'HR_PENDING' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED', remarks?: string) => void;
  onSelectRequest: (request: LeaveRequestDetail) => void;
  currentRole: 'HR' | 'ADMIN' | 'EMPLOYEE';
  isDarkMode: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leaveRequests,
  onMoveStatus,
  onSelectRequest,
  currentRole,
  isDarkMode,
}) => {
  const [draggedRequestId, setDraggedRequestId] = useState<number | null>(null);

  const columns: Array<{
    id: 'HR_PENDING' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED';
    title: string;
    description: string;
    color: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'HR_PENDING',
      title: 'HR Screening',
      description: 'Initial document check',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'ADMIN_PENDING',
      title: 'Admin Approval',
      description: 'Final decision & AI audit',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: <Bot className="w-4 h-4 text-blue-500" />,
    },
    {
      id: 'APPROVED',
      title: 'Approved',
      description: 'Balance auto-deducted',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    },
    {
      id: 'REJECTED',
      title: 'Rejected',
      description: 'Declined or cancelled',
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: <XCircle className="w-4 h-4 text-rose-500" />,
    },
  ];

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    setDraggedRequestId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: 'HR_PENDING' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED') => {
    e.preventDefault();
    const reqIdStr = e.dataTransfer.getData('text/plain');
    const reqId = parseInt(reqIdStr, 10);
    if (!isNaN(reqId)) {
      onMoveStatus(reqId, targetColumnId);
    }
    setDraggedRequestId(null);
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Kanban Approval Pipeline</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Drag and drop leave requests between workflow columns to approve, screen, or reject.</p>
        </div>
        <span className="text-xs text-slate-400 font-medium">Interactive Drag & Drop Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colRequests = leaveRequests.filter((r) => r.status === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl p-4 border transition-all flex flex-col min-h-[520px] ${
                isDarkMode 
                  ? 'bg-slate-900/60 border-slate-800' 
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  {col.icon}
                  <div>
                    <h3 className="font-bold text-sm leading-tight">{col.title}</h3>
                    <p className="text-[10px] text-slate-400">{col.description}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.color}`}>
                  {colRequests.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-3">
                {colRequests.map((req) => (
                  <div
                    key={req.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, req.id)}
                    onClick={() => onSelectRequest(req)}
                    className={`p-4 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${
                      isDarkMode 
                        ? 'bg-slate-800/90 border-slate-700/80 hover:border-blue-500' 
                        : 'bg-white border-slate-200/90 hover:border-blue-500'
                    }`}
                  >
                    {/* Employee Profile Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                          {req.user.first_name?.[0] || req.user.username[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {req.user.full_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 block">{req.user.department || 'Employee'}</span>
                        </div>
                      </div>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" 
                        style={{ backgroundColor: req.leave_type.color_code }}
                      >
                        {req.leave_type.name}
                      </span>
                    </div>

                    {/* Dates & Duration */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                      <span className="font-semibold">{req.start_date}</span> to <span className="font-semibold">{req.end_date}</span>
                      <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">({req.duration}d)</span>
                    </div>

                    {/* Reason Snippet */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic mb-3">
                      "{req.reason}"
                    </p>

                    {/* Card Footer Indicators */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                      <div className="flex items-center space-x-2">
                        {req.medical_certificate && (
                          <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <FileCheck className="w-3 h-3" />
                            <span>Doc Attached</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Audit Log</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Quick Move Action Buttons */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[10px]">
                      {col.id === 'HR_PENDING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveStatus(req.id, 'ADMIN_PENDING');
                          }}
                          className="w-full py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-semibold transition-colors flex items-center justify-center space-x-1"
                        >
                          <span>Screen & Forward to Admin</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {col.id === 'ADMIN_PENDING' && (
                        <div className="flex items-center space-x-2 w-full">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveStatus(req.id, 'APPROVED');
                            }}
                            className="flex-1 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-semibold hover:bg-emerald-100 text-center"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveStatus(req.id, 'REJECTED');
                            }}
                            className="flex-1 py-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 font-semibold hover:bg-rose-100 text-center"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ))}

                {colRequests.length === 0 && (
                  <div className="h-36 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
                    <span>No requests in this stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
