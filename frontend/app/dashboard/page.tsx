"use client";

import React, { useState } from 'react';
import { HeaderNavbar } from '../../components/dashboard/HeaderNavbar';
import { MetricsCharts } from '../../components/dashboard/MetricsCharts';
import { KanbanBoard } from '../../components/dashboard/KanbanBoard';
import { AuditOffcanvasDrawer, LeaveRequestDetail } from '../../components/dashboard/AuditOffcanvasDrawer';
import { ActivityFeedWebSocket } from '../../components/dashboard/ActivityFeedWebSocket';

export default function HRDashboardPage() {
  const [currentRole, setCurrentRole] = useState<'HR' | 'ADMIN' | 'EMPLOYEE'>('HR');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Initial enterprise sample leave requests dataset
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDetail[]>([
    {
      id: 1,
      user: {
        id: 10,
        username: 'sarah.j',
        first_name: 'Sarah',
        last_name: 'Jenkins',
        full_name: 'Sarah Jenkins',
        department: 'Engineering',
        designation: 'Senior Frontend Developer',
      },
      leave_type: { name: 'Sick Leave', color_code: '#ef4444' },
      start_date: '2026-09-14',
      end_date: '2026-09-16',
      duration: 3,
      reason: 'Severe fever and influenza. Doctor recommended complete rest.',
      medical_certificate: 'medical_cert_sarah.pdf',
      status: 'HR_PENDING',
    },
    {
      id: 2,
      user: {
        id: 11,
        username: 'mscott',
        first_name: 'Michael',
        last_name: 'Scott',
        full_name: 'Michael Scott',
        department: 'Sales',
        designation: 'Regional Manager',
      },
      leave_type: { name: 'Casual Leave', color_code: '#3b82f6' },
      start_date: '2026-09-18',
      end_date: '2026-09-19',
      duration: 2,
      reason: 'Personal family event in Scranton.',
      status: 'ADMIN_PENDING',
    },
    {
      id: 3,
      user: {
        id: 12,
        username: 'emily.z',
        first_name: 'Emily',
        last_name: 'Zhang',
        full_name: 'Emily Zhang',
        department: 'Product',
        designation: 'Product Lead',
      },
      leave_type: { name: 'Vacation', color_code: '#10b981' },
      start_date: '2026-09-20',
      end_date: '2026-09-25',
      duration: 6,
      reason: 'Annual vacation trip reserved in advance.',
      status: 'APPROVED',
      admin_remarks: 'Approved by Admin. All sprint handovers complete.',
    },
    {
      id: 4,
      user: {
        id: 13,
        username: 'david.m',
        first_name: 'David',
        last_name: 'Miller',
        full_name: 'David Miller',
        department: 'Operations',
        designation: 'Ops Lead',
      },
      leave_type: { name: 'Sick Leave', color_code: '#ef4444' },
      start_date: '2026-09-10',
      end_date: '2026-09-11',
      duration: 2,
      reason: 'Dental emergency procedure.',
      medical_certificate: 'dental_clinic_receipt.png',
      status: 'REJECTED',
      rejection_reason: 'Insufficient leave balance remaining for Sick Leave type.',
    },
  ]);

  const pendingHrCount = leaveRequests.filter((r) => r.status === 'HR_PENDING').length;
  const pendingAdminCount = leaveRequests.filter((r) => r.status === 'ADMIN_PENDING').length;

  const handleMoveStatus = (
    requestId: number,
    targetStatus: 'HR_PENDING' | 'ADMIN_PENDING' | 'APPROVED' | 'REJECTED',
    remarks?: string
  ) => {
    setLeaveRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: targetStatus,
            admin_remarks: remarks || req.admin_remarks,
          };
        }
        return req;
      })
    );
  };

  const handleSelectRequest = (request: LeaveRequestDetail) => {
    setSelectedRequest(request);
    setIsDrawerOpen(true);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Navbar */}
      <HeaderNavbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        wsConnected={wsConnected}
        pendingHrCount={pendingHrCount}
        pendingAdminCount={pendingAdminCount}
      />

      {/* Main Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner Section */}
        <div className="rounded-3xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-md mb-2 inline-block">
              Enterprise Dashboard &bull; {currentRole} Mode
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Leave Request Management & AI Audit Trail
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
              Real-time drag & drop approval pipeline with automated Gemini AI medical certificate verification and workload reassignment.
            </p>
          </div>
        </div>

        {/* 1. Interactive Recharts Visualizations */}
        <MetricsCharts isDarkMode={isDarkMode} />

        {/* 2. Drag & Drop Kanban Approval Pipeline */}
        <KanbanBoard
          leaveRequests={leaveRequests}
          onMoveStatus={handleMoveStatus}
          onSelectRequest={handleSelectRequest}
          currentRole={currentRole}
          isDarkMode={isDarkMode}
        />

        {/* 3. Real-Time WebSocket Activity Stream */}
        <ActivityFeedWebSocket
          isDarkMode={isDarkMode}
          onConnectionChange={setWsConnected}
        />

        {/* 4. Contextual Off-canvas Drawer */}
        <AuditOffcanvasDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          leaveRequest={selectedRequest}
          isDarkMode={isDarkMode}
          onReassignTask={(reqId, targetId, title, notes) => {
            console.log(`Task '${title}' reassigned for request #${reqId} to user #${targetId}`);
          }}
        />
      </main>
    </div>
  );
}
