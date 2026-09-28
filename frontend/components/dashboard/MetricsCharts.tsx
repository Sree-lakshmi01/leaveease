"use client";

import React from 'react';
import { TrendingUp, PieChart, BarChart3, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface MetricsChartsProps {
  isDarkMode: boolean;
  analyticsData?: {
    review_velocity: Array<{ day: string; submitted: number; approved: number; rejected: number }>;
    leave_distribution: Array<{ leave_type__name: string; leave_type__color_code: string; value: number }>;
    status_summary: { hr_pending: number; admin_pending: number; approved: number; rejected: number };
  };
}

export const MetricsCharts: React.FC<MetricsChartsProps> = ({ isDarkMode, analyticsData }) => {
  // Sample data fallback if server data loading
  const velocityData = analyticsData?.review_velocity || [
    { day: 'Mon Sep 07', submitted: 8, approved: 6, rejected: 1 },
    { day: 'Tue Sep 08', submitted: 12, approved: 9, rejected: 2 },
    { day: 'Wed Sep 09', submitted: 15, approved: 11, rejected: 3 },
    { day: 'Thu Sep 10', submitted: 10, approved: 8, rejected: 1 },
    { day: 'Fri Sep 11', submitted: 18, approved: 14, rejected: 2 },
    { day: 'Sat Sep 12', submitted: 5, approved: 4, rejected: 0 },
    { day: 'Sun Sep 13', submitted: 3, approved: 3, rejected: 0 },
  ];

  const distributionData = analyticsData?.leave_distribution || [
    { leave_type__name: 'Sick Leave', leave_type__color_code: '#ef4444', value: 45 },
    { leave_type__name: 'Casual Leave', leave_type__color_code: '#3b82f6', value: 30 },
    { leave_type__name: 'Vacation', leave_type__color_code: '#10b981', value: 15 },
    { leave_type__name: 'Maternity/Paternity', leave_type__color_code: '#8b5cf6', value: 10 },
  ];

  const maxSubmitted = Math.max(...velocityData.map(d => d.submitted), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* 1. Review Velocity Line & Area Chart */}
      <div className={`lg:col-span-2 rounded-2xl p-5 border shadow-sm transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Review Velocity & Request Throughput</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily leave request submission vs approval velocity</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            +18% Velocity
          </span>
        </div>

        {/* Visual Chart Graphic Area */}
        <div className="h-56 w-full flex items-end justify-between space-x-2 pt-6 pb-2 px-2">
          {velocityData.map((item, idx) => {
            const submittedHeight = Math.round((item.submitted / maxSubmitted) * 100);
            const approvedHeight = Math.round((item.approved / maxSubmitted) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                
                {/* Tooltip on hover */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded-lg p-2 shadow-lg z-20 pointer-events-none whitespace-nowrap">
                  <div>Submitted: {item.submitted}</div>
                  <div className="text-emerald-400">Approved: {item.approved}</div>
                  <div className="text-rose-400">Rejected: {item.rejected}</div>
                </div>

                <div className="w-full flex items-end justify-center space-x-1 h-44">
                  {/* Submitted Bar */}
                  <div 
                    style={{ height: `${submittedHeight}%` }} 
                    className="w-3 sm:w-4 rounded-t-md bg-blue-500/30 dark:bg-blue-600/30 group-hover:bg-blue-500 transition-colors"
                  />
                  {/* Approved Bar */}
                  <div 
                    style={{ height: `${approvedHeight}%` }} 
                    className="w-3 sm:w-4 rounded-t-md bg-emerald-500 dark:bg-emerald-400 group-hover:bg-emerald-400 transition-colors shadow-sm"
                  />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium truncate w-full text-center">
                  {item.day.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-blue-500/40 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-300">Submitted</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-300">Approved</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-300">Rejected</span>
          </div>
        </div>
      </div>

      {/* 2. Leave Type Distribution Donut Chart */}
      <div className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Leave Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Breakdown by Leave Type</p>
            </div>
          </div>

          {/* Donut representation */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-8 border-indigo-500 border-t-rose-500 border-r-emerald-500 border-b-amber-500 flex items-center justify-center shadow-inner">
              <div className="text-center">
                <span className="text-2xl font-extrabold tracking-tight">100%</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Distribution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown List */}
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {distributionData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.leave_type__color_code }}></span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{item.leave_type__name}</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
