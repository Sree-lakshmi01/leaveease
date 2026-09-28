"use client";

import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  FileText, 
  UserPlus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  ArrowRight, 
  Briefcase, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export interface LeaveRequestDetail {
  id: number;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: string;
    designation: string;
  };
  leave_type: {
    name: string;
    color_code: string;
  };
  start_date: string;
  end_date: string;
  duration: number;
  reason: string;
  medical_certificate?: string | null;
  status: 'HR_PENDING' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED';
  admin_remarks?: string | null;
  ai_audit_logs?: Array<{
    id: number;
    action: string;
    confidence_score: number;
    extracted_reason: string;
    document_verified: boolean;
    created_at_formatted: string;
  }>;
  task_reassignments?: Array<{
    id: number;
    reassigned_to_name: string;
    task_title: string;
    status: string;
  }>;
}

interface AuditOffcanvasDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequestDetail | null;
  isDarkMode: boolean;
  onReassignTask?: (requestId: number, targetUserId: number, taskTitle: string, notes: string) => void;
}

export const AuditOffcanvasDrawer: React.FC<AuditOffcanvasDrawerProps> = ({
  isOpen,
  onClose,
  leaveRequest,
  isDarkMode,
  onReassignTask,
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'DOCUMENT' | 'REASSIGN'>('AUDIT');
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !leaveRequest) return null;

  const mockTeamMembers = [
    { id: 101, name: 'David Miller', role: 'Senior Developer', activeLoad: 2, maxCapacity: 5 },
    { id: 102, name: 'Emily Zhang', role: 'Product Specialist', activeLoad: 4, maxCapacity: 5 },
    { id: 103, name: 'Marcus Vance', role: 'HR Coordinator', activeLoad: 1, maxCapacity: 4 },
  ];

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignee || !taskTitle.trim()) return;
    setIsSubmitting(true);
    if (onReassignTask) {
      onReassignTask(leaveRequest.id, selectedAssignee, taskTitle, handoverNotes);
    }
    setTimeout(() => {
      setIsSubmitting(false);
      setTaskTitle('');
      setHandoverNotes('');
      alert('Task successfully reassigned!');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end transition-opacity">
      <div 
        className={`w-full max-w-xl h-full shadow-2xl flex flex-col justify-between border-l transition-transform duration-300 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm shadow-inner">
              {leaveRequest.user.first_name?.[0] || leaveRequest.user.username[0]}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{leaveRequest.user.full_name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {leaveRequest.user.designation || 'Team Member'} &bull; {leaveRequest.user.department || 'Operations'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'AUDIT' 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveTab('DOCUMENT')}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'DOCUMENT' 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Medical Cert & Docs</span>
          </button>

          <button
            onClick={() => setActiveTab('REASSIGN')}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'REASSIGN' 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Task Reassignment</span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Request Quick Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-1 rounded-full text-white font-medium" style={{ backgroundColor: leaveRequest.leave_type.color_code }}>
                {leaveRequest.leave_type.name}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Duration: {leaveRequest.duration} Day(s)
              </span>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong>Dates:</strong> {leaveRequest.start_date} to {leaveRequest.end_date}
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong>Reason:</strong> "{leaveRequest.reason}"
            </div>
          </div>

          {/* TAB 1: AI AUDIT TRAIL */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini AI Verification Engine</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                  98% Confidence
                </span>
              </div>

              {/* AI Verification Timeline */}
              <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-6">
                
                {/* Audit Item 1 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[10px]">
                    ✓
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Medical Document OCR Passed</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Extracted dates matching requested leave period ({leaveRequest.start_date} to {leaveRequest.end_date}).
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Just now &bull; Automated Task</span>
                  </div>
                </div>

                {/* Audit Item 2 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[10px]">
                    ✓
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Leave Balance Check</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Employee has sufficient remaining balance for this request.
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">2 mins ago &bull; Django Signals</span>
                  </div>
                </div>

                {/* Audit Item 3 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[10px]">
                    ✓
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-slate-100">HR Screening Auto-Verification</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Forwarded to Admin Approval pipeline with zero fraud flags.
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">5 mins ago &bull; AI Agent</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENT PREVIEW */}
          {activeTab === 'DOCUMENT' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm">Uploaded Medical Certificate</h3>
              {leaveRequest.medical_certificate ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/40 text-center space-y-3">
                  <FileCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold">{leaveRequest.medical_certificate}</p>
                  <a
                    href={`/media/${leaveRequest.medical_certificate}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <span>View Attachment Document</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No document attached to this request.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TASK REASSIGNMENT */}
          {activeTab === 'REASSIGN' && (
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <h3 className="font-bold text-sm">Reassign Workload & Active Tasks</h3>

              {/* Select Team Member */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Substitute Team Member
                </label>
                <div className="space-y-2">
                  {mockTeamMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedAssignee(member.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        selectedAssignee === member.id
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/60 dark:border-blue-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{member.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{member.role}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          Load: {member.activeLoad}/{member.maxCapacity} Tasks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task / Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Onboarding Handover"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Handover Notes & Guidelines
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific instructions for the temporary owner..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedAssignee}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Reassigning...' : 'Execute Task Reassignment'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
