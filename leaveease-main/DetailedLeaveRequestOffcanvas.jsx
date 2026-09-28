import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  User,
  Tag,
  Briefcase,
  Calendar,
  FileText,
  Check,
  RotateCcw,
  MessageSquare,
  Building,
  ChevronRight,
  Eye,
  Flame,
  Zap,
  AlertTriangle,
  Send,
  Paperclip,
  CheckCheck
} from 'lucide-react';

// ============================================================================
// MOCK DATA DEFAULTS & INTERFACES (For standalone or fallback usage)
// ============================================================================

export const DEFAULT_CURRENT_USER = {
  id: "usr-001",
  name: "Alexander Wright",
  role: "ADMIN", // 'ADMIN' or 'HR'
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
};

export const DEFAULT_LEAVE_REQUEST = {
  id: "LR-2026-8942",
  status: "HR_PENDING", // 'HR_PENDING' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED'
  employee: {
    id: "emp-502",
    name: "Mohammed Al-Mansoor",
    department: "Engineering",
    roleTitle: "Senior Frontend Engineer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    email: "m.almansoor@leaveease.io"
  },
  leaveDetails: {
    type: "Sick Leave",
    typeColor: "#F59E0B", // amber
    startDate: "Feb 11, 2026",
    endDate: "Feb 13, 2026",
    requestedDays: 3,
    reason: "Severe fever, acute throat infection and prescribed 3 days strict bed rest by medical consultant.",
    hasCertificate: true,
    certificateUrl: "#"
  },
  balances: [
    { type: "Sick Leave", used: 6, total: 10, remaining: 4, color: "bg-amber-500", trackBg: "bg-amber-500/20" },
    { type: "Casual Leave", used: 7, total: 12, remaining: 5, color: "bg-indigo-500", trackBg: "bg-indigo-500/20" },
    { type: "Annual Leave", used: 8, total: 20, remaining: 12, color: "bg-emerald-500", trackBg: "bg-emerald-500/20" },
    { type: "Maternity / Paternity", used: 0, total: 0, remaining: "N/A", isNA: true, color: "bg-slate-600", trackBg: "bg-slate-800" }
  ],
  tasks: [
    {
      id: "task-301",
      title: "Q3 Financial & Capacity Planning Report",
      priority: "high",
      category: "Analytics & Finance",
      estHours: 5,
      reassignedTo: "member-1"
    },
    {
      id: "task-302",
      title: "UI Component Refactor & Dark Mode Polish",
      priority: "medium",
      category: "Frontend Dev",
      estHours: 4,
      reassignedTo: null
    },
    {
      id: "task-303",
      title: "Weekly Sprint Review & Jira Backlog Scrub",
      priority: "low",
      category: "Project Mgmt",
      estHours: 2,
      reassignedTo: null
    }
  ],
  auditTrail: [
    {
      id: "audit-2",
      stage: "HR Review",
      title: "HR Verified Leave Balance & Medical Certificate",
      timestamp: "Feb 9, 2026 • 10:00 AM",
      actor: "Sarah Jenkins (HR Manager)",
      actorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      notes: "Leave balance is verified and doctor note attachment is valid.",
      type: "hr_verification"
    },
    {
      id: "audit-1",
      stage: "Submission",
      title: "Leave Request Submitted",
      timestamp: "Feb 8, 2026 • 09:00 PM",
      actor: "Mohammed Al-Mansoor",
      actorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      notes: "Requested 3 consecutive days for Sick Leave.",
      type: "submission"
    }
  ]
};

export const DEFAULT_TEAM_MEMBERS = [
  { id: "member-1", name: "Sarah Connor", role: "Senior Fullstack Lead", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { id: "member-2", name: "John Smith", role: "Fullstack Engineer", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "member-3", name: "Elena Rostova", role: "Backend Architect", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
  { id: "member-4", name: "David Chen", role: "QA Lead", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" }
];

// Helper Priority Badge Config
const PRIORITY_CONFIG = {
  high: { label: "High Priority", bg: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: Flame },
  medium: { label: "Medium", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Zap },
  low: { label: "Low", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: Briefcase }
};

// Status Badge Config
const STATUS_CONFIG = {
  APPROVED: { label: "Approved", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", icon: CheckCircle2 },
  HR_PENDING: { label: "HR Review Pending", bg: "bg-amber-500/15 text-amber-400 border-amber-500/40", icon: Clock },
  ADMIN_PENDING: { label: "Admin Approval Pending", bg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/40", icon: Clock },
  REJECTED: { label: "Rejected", bg: "bg-rose-500/15 text-rose-400 border-rose-500/40", icon: AlertCircle },
  INFO_REQUESTED: { label: "Info Requested", bg: "bg-purple-500/15 text-purple-400 border-purple-500/40", icon: AlertTriangle }
};

/**
 * DetailedLeaveRequestOffcanvas Component
 */
export default function DetailedLeaveRequestOffcanvas({
  isOpen = true,
  onClose = () => {},
  leaveRequest = DEFAULT_LEAVE_REQUEST,
  currentUser = DEFAULT_CURRENT_USER,
  teamMembers = DEFAULT_TEAM_MEMBERS,
  onApprove = () => {},
  onReject = () => {},
  onRequestInfo = () => {},
  onVerifyHR = () => {},
  onFlagHR = () => {},
  onOpenReassignModal = () => {}
}) {
  // State for Task Reassignments: { [taskId]: memberId }
  const [reassignments, setReassignments] = useState(() => {
    const initial = {};
    if (leaveRequest && leaveRequest.tasks) {
      leaveRequest.tasks.forEach(t => {
        initial[t.id] = t.reassignedTo || "";
      });
    }
    return initial;
  });

  // Remarks state
  const [remarks, setRemarks] = useState("");
  
  // Feedback notification
  const [toastMessage, setToastMessage] = useState(null);

  // Sync state when leaveRequest changes
  useEffect(() => {
    if (leaveRequest && leaveRequest.tasks) {
      const updated = {};
      leaveRequest.tasks.forEach(t => {
        updated[t.id] = t.reassignedTo || "";
      });
      setReassignments(updated);
    }
  }, [leaveRequest]);

  const isAdmin = currentUser.role === 'ADMIN';
  const isHR = currentUser.role === 'HR';

  // Handle reassigning task in state
  const handleSelectReassign = (taskId, memberId) => {
    if (!isAdmin) return; // HR is read-only
    setReassignments(prev => ({
      ...prev,
      [taskId]: memberId
    }));
  };

  // Toast notification trigger
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Action handlers
  const handleApproveAction = () => {
    showToast("Leave Approved & Task Handover Applied Successfully!");
    onApprove({ leaveId: leaveRequest.id, reassignments, remarks });
  };

  const handleRejectAction = () => {
    showToast("Leave Request Flagged as Rejected.");
    onReject({ leaveId: leaveRequest.id, remarks });
  };

  const handleRequestInfoAction = () => {
    showToast("Information request sent to employee.");
    onRequestInfo({ leaveId: leaveRequest.id, remarks });
  };

  const handleHRVerifyAction = () => {
    showToast("HR Verification Marked & Forwarded to Admin.");
    onVerifyHR({ leaveId: leaveRequest.id, remarks });
  };

  const handleHRFlagAction = () => {
    showToast("HR Compliance Issue Flagged.");
    onFlagHR({ leaveId: leaveRequest.id, remarks });
  };

  // Status Badge UI
  const currentStatusConfig = STATUS_CONFIG[leaveRequest.status] || STATUS_CONFIG.HR_PENDING;
  const StatusIcon = currentStatusConfig.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />

          {/* Offcanvas Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-screen max-w-2xl sm:max-w-3xl bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col justify-between overflow-hidden"
            >

              {/* Toast Notification Popup */}
              <AnimatePresence>
                {toastMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-indigo-400/30 flex items-center gap-2 backdrop-blur-md"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                    <span>{toastMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ------------------------------------------------------------- */}
              {/* TOP HEADER */}
              {/* ------------------------------------------------------------- */}
              <div className="p-6 bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-10 backdrop-blur-md">
                {/* Upper bar: Close, Title, Status */}
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700/60"
                      title="Close Slide-out"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 tracking-tight">
                        Leave Request Details
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">ID: {leaveRequest.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${currentStatusConfig.bg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {currentStatusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Employee Info Header Card */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <img
                        src={leaveRequest.employee.avatar}
                        alt={leaveRequest.employee.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/40"
                      />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white leading-snug">
                        {leaveRequest.employee.name}
                        <span className="ml-2 text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {leaveRequest.employee.department}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        {leaveRequest.employee.roleTitle}
                      </p>
                    </div>
                  </div>

                  {/* Summary Days & Dates */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700/40 text-xs">
                    <div className="pr-3 border-r border-slate-700/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Duration</span>
                      <span className="text-amber-400 font-bold">{leaveRequest.leaveDetails.requestedDays} Days</span>
                    </div>
                    <div className="pl-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Dates</span>
                      <span className="text-slate-200 font-medium">{leaveRequest.leaveDetails.startDate} - {leaveRequest.leaveDetails.endDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SCROLLABLE MAIN CONTENT BODY */}
              {/* ------------------------------------------------------------- */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                {/* ========================================================= */}
                {/* SECTION 1: LEAVE CONTEXT & BALANCES */}
                {/* ========================================================= */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Leave Context & Balances
                    </h4>
                    {isHR && (
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        HR Compliance Active
                      </span>
                    )}
                  </div>

                  {/* Type & Reason grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Leave Type</span>
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: leaveRequest.leaveDetails.typeColor || '#F59E0B' }}
                        ></span>
                        {leaveRequest.leaveDetails.type}
                      </div>
                    </div>

                    <div className="md:col-span-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">Reason</span>
                        {leaveRequest.leaveDetails.hasCertificate && (
                          <a
                            href={leaveRequest.leaveDetails.certificateUrl}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                          >
                            <Paperclip className="w-3 h-3" /> View Doctor Note
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{leaveRequest.leaveDetails.reason}"
                      </p>
                    </div>
                  </div>

                  {/* Leave Balances UI (Progress Bars & Pills) */}
                  <div className="pt-2">
                    <span className="text-xs font-medium text-slate-400 block mb-3">Leave Balances Overview:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {leaveRequest.balances.map((bal, idx) => {
                        const isNA = bal.isNA;
                        const pct = isNA ? 0 : Math.round((bal.remaining / bal.total) * 100);

                        return (
                          <div key={idx} className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-300 font-medium truncate">{bal.type}</span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isNA ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-slate-200'}`}>
                                {isNA ? 'N/A' : `${bal.remaining}/${bal.total} Left`}
                              </span>
                            </div>

                            {/* Progress bar */}
                            {!isNA ? (
                              <div>
                                <div className={`h-1.5 w-full ${bal.trackBg} rounded-full overflow-hidden mb-1`}>
                                  <div
                                    className={`h-full ${bal.color} transition-all duration-500 rounded-full`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                  <span>Used: {bal.used}d</span>
                                  <span>{pct}% Available</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic">Not applicable</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 2: WORK CONVERSION (TASK REASSIGNMENT) */}
                {/* ========================================================= */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-400" />
                        Work Conversion & Task Reassignment
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Pending tasks during leave dates: <span className="text-white font-semibold">{leaveRequest.tasks.length}</span>
                      </p>
                    </div>

                    {/* Drag and Drop Modal Placeholder Button */}
                    <button
                      onClick={onOpenReassignModal}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl transition-all flex items-center gap-1.5 group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
                      <span>✨ Open Drag-and-Drop Reassignment Modal</span>
                    </button>
                  </div>

                  {/* Mode indicator banner */}
                  {isHR ? (
                    <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span><strong className="text-indigo-300">HR View Mode:</strong> Reassignments are read-only for compliance verification. Only Admin can modify task owners.</span>
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      <span><strong className="text-purple-300">Admin Operational View:</strong> Select a team member for each task below or use the Drag-and-Drop modal above.</span>
                    </div>
                  )}

                  {/* Task List items */}
                  <div className="space-y-3">
                    {leaveRequest.tasks.map((task, idx) => {
                      const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                      const PriorityIcon = priorityInfo.icon;
                      const selectedAssigneeId = reassignments[task.id];
                      const assignedMember = teamMembers.find(m => m.id === selectedAssigneeId);

                      return (
                        <div
                          key={task.id}
                          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                        >
                          {/* Task details */}
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-purple-400 font-bold">{idx + 1}.</span>
                              <h5 className="text-sm font-semibold text-slate-100">{task.title}</h5>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${priorityInfo.bg}`}>
                                <PriorityIcon className="w-2.5 h-2.5" />
                                {priorityInfo.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span>Category: <strong className="text-slate-300 font-normal">{task.category}</strong></span>
                              <span>•</span>
                              <span>Est: <strong className="text-slate-300 font-normal">{task.estHours} hrs</strong></span>
                            </div>
                          </div>

                          {/* Reassignment Dropdown (Interactive for Admin, Read-Only for HR) */}
                          <div className="w-full md:w-64 shrink-0">
                            {isAdmin ? (
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1 font-medium">Reassign to:</label>
                                <select
                                  value={selectedAssigneeId || ""}
                                  onChange={(e) => handleSelectReassign(task.id, e.target.value)}
                                  className="w-full bg-slate-800 text-xs text-slate-100 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                >
                                  <option value="">-- Select Team Member --</option>
                                  {teamMembers.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.role})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div>
                                <span className="block text-[10px] text-slate-400 mb-1 font-medium">Assigned Handover:</span>
                                {assignedMember ? (
                                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
                                    <img src={assignedMember.avatar} alt={assignedMember.name} className="w-5 h-5 rounded-full object-cover" />
                                    <span className="text-slate-200 font-medium truncate">{assignedMember.name}</span>
                                  </div>
                                ) : (
                                  <span className="inline-block text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 italic">
                                    Unassigned (Pending Admin)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 3: AUDIT TRAIL & REMARKS */}
                {/* ========================================================= */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Audit Trail & Process Timeline
                  </h4>

                  {/* Vertical Timeline */}
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {leaveRequest.auditTrail.map((item) => (
                      <div key={item.id} className="relative group">
                        {/* Timeline Node */}
                        <div className="absolute -left-[23px] top-1.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-indigo-400">
                          <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                        </div>

                        {/* Content */}
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-200">{item.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-400">{item.notes}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <img src={item.actorAvatar} alt={item.actor} className="w-4 h-4 rounded-full object-cover" />
                            <span className="text-[11px] text-slate-400">{item.actor}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* HR / Admin Remarks Textarea */}
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      {isAdmin ? "Admin Approval Remarks & Notes:" : "HR Verification & Compliance Remarks:"}
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={isAdmin ? "Add handover notes, conditions, or rejection reasons..." : "Add HR balance check verification details..."}
                      className="w-full bg-slate-900 text-xs text-slate-100 placeholder-slate-500 border border-slate-700/80 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* ------------------------------------------------------------- */}
              {/* FOOTER ACTIONS (ROLE DEPENDENT) */}
              {/* ------------------------------------------------------------- */}
              <div className="p-5 bg-slate-900/95 border-t border-slate-800 sticky bottom-0 z-10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* Left role indicator label */}
                <div className="text-xs text-slate-400 flex items-center gap-2 self-start sm:self-auto">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>Role: <strong className="text-purple-300">{currentUser.role} Manager</strong></span>
                </div>

                {/* Action Buttons Group */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  
                  {/* ADMIN ROLE BUTTONS */}
                  {isAdmin && (
                    <>
                      <button
                        onClick={handleRejectAction}
                        className="px-4 py-2.5 text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={handleRequestInfoAction}
                        className="px-4 py-2.5 text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Request Info</span>
                      </button>

                      <button
                        onClick={handleApproveAction}
                        className="px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-purple-900/30 border border-purple-400/30 transition-all flex items-center gap-2 group"
                      >
                        <Sparkles className="w-4 h-4 text-purple-200 group-hover:rotate-12 transition-transform" />
                        <span>Approve & Apply Handover</span>
                      </button>
                    </>
                  )}

                  {/* HR ROLE BUTTONS */}
                  {isHR && (
                    <>
                      <button
                        onClick={handleHRFlagAction}
                        className="px-4 py-2.5 text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Flag Issue</span>
                      </button>

                      <button
                        onClick={() => showToast("Remarks Saved to Audit Trail")}
                        className="px-4 py-2.5 text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Add Remarks</span>
                      </button>

                      <button
                        onClick={handleHRVerifyAction}
                        className="px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all flex items-center gap-2 group"
                      >
                        <UserCheck className="w-4 h-4 text-emerald-100" />
                        <span>Mark as Verified</span>
                      </button>
                    </>
                  )}

                </div>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
