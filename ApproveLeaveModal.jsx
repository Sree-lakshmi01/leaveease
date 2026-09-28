import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  GripVertical,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wand2,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  User,
  Tag,
  Flame,
  Zap,
  Briefcase,
  ArrowRightLeft,
  Check
} from 'lucide-react';

// ==========================================
// MOCK DATA & CONSTANTS
// ==========================================
const INITIAL_LEAVE_REQUEST = {
  employeeName: "Mohammed Al-Mansoor",
  role: "Senior Frontend Developer",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  leaveType: "Sick Leave",
  startDate: "Aug 15, 2026",
  endDate: "Aug 17, 2026",
  durationDays: 3,
};

const INITIAL_TASKS = [
  {
    id: "task-101",
    title: "Fix Login API Timeout & Auth Token Renewal",
    priority: "high",
    estHours: 4,
    category: "Backend API",
    assignedTo: null,
  },
  {
    id: "task-102",
    title: "Update User Auth Documentation & Swagger Specs",
    priority: "medium",
    estHours: 2,
    category: "Documentation",
    assignedTo: null,
  },
  {
    id: "task-103",
    title: "Refactor Leave Request Dashboard Components",
    priority: "low",
    estHours: 6,
    category: "Frontend UI",
    assignedTo: null,
  },
];

const INITIAL_TEAM = [
  {
    id: "member-1",
    name: "Sarah Connor",
    role: "Senior Fullstack Lead",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    baseLoad: 2,
    maxCapacity: 6,
    skills: ["React", "API", "Auth"],
  },
  {
    id: "member-2",
    name: "John Smith",
    role: "Fullstack Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    baseLoad: 3,
    maxCapacity: 5,
    skills: ["Docs", "UI", "Node.js"],
  },
  {
    id: "member-3",
    name: "Elena Rostova",
    role: "Backend Architect",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    baseLoad: 4,
    maxCapacity: 5,
    skills: ["Python", "PostgreSQL", "DevOps"],
  },
];

// Helper Badge Configs
const PRIORITY_CONFIG = {
  high: {
    label: "High Priority",
    bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    icon: Flame,
  },
  medium: {
    label: "Medium Priority",
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: Zap,
  },
  low: {
    label: "Low Priority",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: Briefcase,
  },
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ApproveLeaveModal({ isOpen = true, onClose = () => {} }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [team, setTeam] = useState(INITIAL_TEAM);
  
  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [hoveredMemberId, setHoveredMemberId] = useState(null);

  // Success Confirmation State
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Derived state: Pending tasks (unassigned)
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.assignedTo), [tasks]);
  
  // Progress calculations
  const totalTasks = tasks.length;
  const assignedCount = totalTasks - pendingTasks.length;
  const isAllAssigned = pendingTasks.length === 0;
  const progressPercent = Math.round((assignedCount / totalTasks) * 100);

  // Get dynamic workload metrics per team member
  const getMemberCapacity = (memberId) => {
    const member = team.find((m) => m.id === memberId);
    if (!member) return { current: 0, max: 5, percentage: 0, status: "available" };
    
    const assignedTasksForMember = tasks.filter((t) => t.assignedTo === memberId);
    const totalCurrentLoad = member.baseLoad + assignedTasksForMember.length;
    const percentage = Math.min(100, Math.round((totalCurrentLoad / member.maxCapacity) * 100));

    let status = "available"; // 🟢 High capacity
    let label = "High Capacity";
    let badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

    if (percentage > 80) {
      status = "busy"; // 🔴 Low capacity
      label = "Heavy Load";
      badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    } else if (percentage > 50) {
      status = "moderate"; // 🟡 Med capacity
      label = "Med Capacity";
      badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }

    return {
      current: totalCurrentLoad,
      max: member.maxCapacity,
      added: assignedTasksForMember.length,
      percentage,
      status,
      label,
      badgeStyle,
    };
  };

  // Reassign Task Handler
  const assignTask = (taskId, targetMemberId) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, assignedTo: targetMemberId } : task))
    );
  };

  // Unassign / Remove Task from member back to pending queue
  const unassignTask = (taskId) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, assignedTo: null } : task))
    );
  };

  // Smart Auto-Assign Algorithm (Distribute evenly to lowest load)
  const handleAutoBalance = () => {
    const unassigned = tasks.filter((t) => !t.assignedTo);
    if (unassigned.length === 0) return;

    let currentTasksState = [...tasks];
    
    // Process unassigned tasks one by one
    unassigned.forEach((task) => {
      // Find team member with lowest workload percentage
      let lowestMember = null;
      let minLoadRatio = Infinity;

      team.forEach((member) => {
        const assignedCount = currentTasksState.filter((t) => t.assignedTo === member.id).length;
        const totalLoad = member.baseLoad + assignedCount;
        const ratio = totalLoad / member.maxCapacity;

        if (ratio < minLoadRatio) {
          minLoadRatio = ratio;
          lowestMember = member;
        }
      });

      if (lowestMember) {
        currentTasksState = currentTasksState.map((t) =>
          t.id === task.id ? { ...t, assignedTo: lowestMember.id } : t
        );
      }
    });

    setTasks(currentTasksState);
  };

  // Reset to initial mock state
  const handleReset = () => {
    setTasks(INITIAL_TASKS);
    setIsSubmitted(false);
  };

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, memberId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredMemberId !== memberId) {
      setHoveredMemberId(memberId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetMemberId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId && targetMemberId) {
      assignTask(taskId, targetMemberId);
    }
    setDraggedTaskId(null);
    setHoveredMemberId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setHoveredMemberId(null);
  };

  const handleSubmit = () => {
    if (!isAllAssigned) return;
    setIsSubmitted(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-950/80 backdrop-blur-md overflow-y-auto selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className="relative w-full max-w-5xl bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl shadow-purple-950/40 text-slate-100 overflow-hidden backdrop-blur-xl"
      >
        {/* ========================================== */}
        {/* HEADER SECTION                             */}
        {/* ========================================== */}
        <div className="relative px-6 py-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                Approve Leave & Delegate Tasks
              </h2>
              <p className="text-xs text-slate-400">
                Ensure zero business interruption by reassigning active work before leave authorization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================== */}
        {/* REQUEST CONTEXT BANNER                      */}
        {/* ========================================== */}
        <div className="px-6 py-3.5 bg-indigo-950/30 border-b border-indigo-900/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={INITIAL_LEAVE_REQUEST.avatar}
              alt={INITIAL_LEAVE_REQUEST.employeeName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/40 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-100">
                  {INITIAL_LEAVE_REQUEST.employeeName}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {INITIAL_LEAVE_REQUEST.leaveType}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {INITIAL_LEAVE_REQUEST.role} •{" "}
                <span className="text-indigo-300 font-medium">
                  {INITIAL_LEAVE_REQUEST.startDate} - {INITIAL_LEAVE_REQUEST.endDate} ({INITIAL_LEAVE_REQUEST.durationDays} Days)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{pendingTasks.length} pending task(s) require delegation</span>
          </div>
        </div>

        {/* ========================================== */}
        {/* MAIN BODY: SUCCESS STATE OR WORKSPACE      */}
        {/* ========================================== */}
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Leave Approved & Tasks Reassigned!
            </h3>
            <p className="text-sm text-slate-300 max-w-md">
              Mohammed's leave request has been processed successfully. All {totalTasks} tasks have been delegated to team members to ensure smooth operations.
            </p>
            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Test Again (Reset Demo)
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all"
              >
                Done & Close
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[460px]">
            {/* ========================================== */}
            {/* LEFT COLUMN: PENDING TASKS                 */}
            {/* ========================================== */}
            <div className="lg:col-span-5 flex flex-col bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 shadow-inner">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Pending Tasks ({pendingTasks.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                  Drag card to assign
                </span>
              </div>

              {/* Task list container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] pr-1">
                <AnimatePresence>
                  {pendingTasks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-200">
                        All tasks assigned!
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                        You can now complete approval or adjust assignments on the right.
                      </p>
                    </motion.div>
                  ) : (
                    pendingTasks.map((task) => {
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                      const PriorityIcon = priority.icon;
                      const isBeingDragged = draggedTaskId === task.id;

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: isBeingDragged ? 0.4 : 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98, rotate: 1 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={`relative group p-4 rounded-xl bg-slate-900/90 border ${
                            isBeingDragged
                              ? "border-indigo-500 shadow-xl shadow-indigo-500/20"
                              : "border-slate-800 hover:border-slate-700"
                          } transition-all duration-200 cursor-grab active:cursor-grabbing shadow-md`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 text-slate-500 group-hover:text-indigo-400 transition-colors">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-semibold text-slate-200 truncate">
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                {/* Priority Badge */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priority.bg}`}
                                >
                                  <PriorityIcon className="w-3 h-3" />
                                  {priority.label}
                                </span>

                                {/* Category Tag */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                                  {task.category}
                                </span>

                                {/* Hours */}
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 ml-auto">
                                  <Clock className="w-3 h-3" />
                                  {task.estHours}h est.
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Mobile/Click Assign Fallback Menu */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Quick Assign:</span>
                            <div className="flex items-center gap-1">
                              {team.map((member) => (
                                <button
                                  key={member.id}
                                  onClick={() => assignTask(task.id, member.id)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-[10px]"
                                  title={`Assign to ${member.name}`}
                                >
                                  {member.name.split(" ")[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ========================================== */}
            {/* RIGHT COLUMN: AVAILABLE TEAM DROP ZONES    */}
            {/* ========================================== */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Available Team Members (Drop Target)
                  </h3>
                </div>

                {/* Auto-Balance Button */}
                <button
                  onClick={handleAutoBalance}
                  disabled={pendingTasks.length === 0}
                  className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  Auto-Balance Workload
                </button>
              </div>

              {/* Team Members List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[390px] pr-1">
                {team.map((member) => {
                  const capacity = getMemberCapacity(member.id);
                  const isHovered = hoveredMemberId === member.id;
                  const assignedToMember = tasks.filter((t) => t.assignedTo === member.id);

                  return (
                    <div
                      key={member.id}
                      onDragOver={(e) => handleDragOver(e, member.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, member.id)}
                      className={`relative p-4 rounded-xl border transition-all duration-200 ${
                        isHovered
                          ? "border-dashed border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950/50"
                          : "border-slate-800/90 bg-slate-950/40 hover:border-slate-700/80"
                      }`}
                    >
                      {/* Team Member Header Info */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-800"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-white">
                                {member.name}
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                ({member.role})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {member.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Capacity Indicator Pill */}
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${capacity.badgeStyle}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                capacity.status === "available"
                                  ? "bg-emerald-400 animate-pulse"
                                  : capacity.status === "moderate"
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                              }`}
                            />
                            {capacity.label}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Load: {capacity.current}/{capacity.max} tasks
                            {capacity.added > 0 && (
                              <span className="text-indigo-400 font-semibold ml-1">
                                (+{capacity.added})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-3">
                        <motion.div
                          className={`h-full rounded-full ${
                            capacity.status === "available"
                              ? "bg-emerald-500"
                              : capacity.status === "moderate"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${capacity.percentage}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>

                      {/* Assigned Tasks Drop Target Box */}
                      <div className="min-h-[48px] rounded-lg bg-slate-900/60 border border-slate-800/60 p-2 flex flex-col gap-1.5 justify-center">
                        {assignedToMember.length === 0 ? (
                          <div className="text-center py-1">
                            <span className="text-[11px] text-slate-500 italic flex items-center justify-center gap-1">
                              <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                              Drop tasks here to reassign
                            </span>
                          </div>
                        ) : (
                          <AnimatePresence>
                            {assignedToMember.map((task) => (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-indigo-950/50 border border-indigo-900/50 text-xs text-slate-200"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="truncate font-medium text-[11px]">
                                    {task.title}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                                    {task.estHours}h
                                  </span>
                                </div>

                                <button
                                  onClick={() => unassignTask(task.id)}
                                  className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors ml-2"
                                  title="Unassign / Return task"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* FOOTER ACTIONS & PROGRESS BAR              */}
        {/* ========================================== */}
        {!isSubmitted && (
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            {/* Progress Counter & Visual Bar */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                  animate={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-300 font-medium">
                {assignedCount} of {totalTasks} reassigned ({progressPercent}%)
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Reset pending tasks"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={!isAllAssigned}
                className={`relative group px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                  isAllAssigned
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                }`}
              >
                <span>Approve & Route</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isAllAssigned ? "group-hover:translate-x-0.5" : ""} transition-transform`} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
