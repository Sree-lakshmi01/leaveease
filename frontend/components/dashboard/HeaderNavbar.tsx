"use client";

import React, { useState } from 'react';
import { 
  Bell, 
  Moon, 
  Sun, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  ChevronDown, 
  CheckCircle2, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

interface HeaderNavbarProps {
  currentRole: 'HR' | 'ADMIN' | 'EMPLOYEE';
  onRoleChange: (role: 'HR' | 'ADMIN' | 'EMPLOYEE') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  wsConnected: boolean;
  pendingHrCount: number;
  pendingAdminCount: number;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentRole,
  onRoleChange,
  isDarkMode,
  onToggleDarkMode,
  wsConnected,
  pendingHrCount,
  pendingAdminCount,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className={`sticky top-0 z-40 w-full border-b backdrop-blur transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-slate-900/90 border-slate-800 text-slate-100' 
        : 'bg-white/90 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Real-time Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              LE
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:to-indigo-300">
                LeaveEase
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                Enterprise
              </span>
            </div>
          </div>

          {/* WebSocket Connection Badge */}
          <div className={`hidden sm:flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            wsConnected 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
          }`}>
            {wsConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3 h-3 ml-1" />
                <span>Live Feed Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-500" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center space-x-3">
          
          {/* Pending Counters Quick Pill */}
          <div className="hidden md:flex items-center space-x-2 text-xs font-medium">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              HR Pending: <strong className="text-blue-600 dark:text-blue-400 font-bold">{pendingHrCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Admin Pending: <strong className="text-purple-600 dark:text-purple-400 font-bold">{pendingAdminCount}</strong>
            </span>
          </div>

          {/* Dark / Light Theme Toggle */}
          <button 
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
            </button>

            {showNotifications && (
              <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border p-4 z-50 transition-all ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-semibold text-sm">Real-Time Notifications</h4>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Clear all</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                    <p className="font-medium text-slate-800 dark:text-slate-200">New Sick Leave Request</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">Submitted by Sarah Jenkins (3 days)</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                    <p className="font-medium text-slate-800 dark:text-slate-200">AI Auto-Approval Executed</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">Medical certificate verified authentic by Gemini</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role-Based Access Control Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Role: <strong className="text-slate-900 dark:text-white">{currentRole}</strong></span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border p-1 z-50 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {(['HR', 'ADMIN', 'EMPLOYEE'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleChange(role);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      currentRole === role 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{role === 'HR' ? 'HR Manager' : role === 'ADMIN' ? 'Admin Approver' : 'Employee View'}</span>
                    {currentRole === role && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
