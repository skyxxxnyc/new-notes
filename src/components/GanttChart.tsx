import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, isSameDay, isWeekend, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

export type Task = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies: string[]; // array of task ids this task depends on
  status: 'todo' | 'in-progress' | 'done';
  assignee?: string;
};

interface GanttChartProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export default function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate the overall date range for the chart
  const { minDate, maxDate } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { minDate: addDays(today, -7), maxDate: addDays(today, 21) };
    }
    
    let min = tasks[0].startDate;
    let max = tasks[0].endDate;
    
    tasks.forEach(task => {
      if (task.startDate < min) min = task.startDate;
      if (task.endDate > max) max = task.endDate;
    });

    // Add some padding
    return {
      minDate: addDays(min, -7),
      maxDate: addDays(max, 14)
    };
  }, [tasks]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: minDate, end: maxDate });
  }, [minDate, maxDate]);

  const cellWidth = viewMode === 'Day' ? 40 : viewMode === 'Week' ? 10 : 3;
  const headerHeight = 60;
  const rowHeight = 48;

  // Group days by month for the header
  const months = useMemo(() => {
    const grouped: { month: string; days: Date[] }[] = [];
    let currentMonth = '';
    let currentGroup: Date[] = [];

    days.forEach(day => {
      const monthStr = format(day, 'MMMM yyyy');
      if (monthStr !== currentMonth) {
        if (currentGroup.length > 0) {
          grouped.push({ month: currentMonth, days: currentGroup });
        }
        currentMonth = monthStr;
        currentGroup = [day];
      } else {
        currentGroup.push(day);
      }
    });
    if (currentGroup.length > 0) {
      grouped.push({ month: currentMonth, days: currentGroup });
    }
    return grouped;
  }, [days]);

  const getTaskStyle = (task: Task) => {
    const startOffset = differenceInDays(task.startDate, minDate);
    const duration = differenceInDays(task.endDate, task.startDate) + 1;
    
    return {
      left: `${startOffset * cellWidth}px`,
      width: `${duration * cellWidth}px`,
      top: '8px',
      height: '32px',
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-500';
      case 'in-progress': return 'bg-orange-500';
      default: return 'bg-slate-300';
    }
  };

  // Scroll to today on mount
  useEffect(() => {
    if (containerRef.current) {
      const todayOffset = differenceInDays(new Date(), minDate);
      const scrollPosition = (todayOffset * cellWidth) - (containerRef.current.clientWidth / 2);
      containerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [minDate, cellWidth]);

  // Draw dependency lines (simple SVG)
  const renderDependencies = () => {
    const lines: JSX.Element[] = [];
    
    tasks.forEach((task, taskIndex) => {
      task.dependencies.forEach(depId => {
        const depTaskIndex = tasks.findIndex(t => t.id === depId);
        if (depTaskIndex !== -1) {
          const depTask = tasks[depTaskIndex];
          
          // Calculate coordinates
          const startX = (differenceInDays(depTask.endDate, minDate) + 1) * cellWidth;
          const startY = (depTaskIndex * rowHeight) + (rowHeight / 2) + headerHeight;
          
          const endX = differenceInDays(task.startDate, minDate) * cellWidth;
          const endY = (taskIndex * rowHeight) + (rowHeight / 2) + headerHeight;
          
          // Draw a path with a right angle
          const path = `M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`;
          
          lines.push(
            <path 
              key={`${depId}-${task.id}`}
              d={path}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#arrowhead)"
            />
          );
        }
      });
    });
    
    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ width: days.length * cellWidth, height: tasks.length * rowHeight + headerHeight }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
          </marker>
        </defs>
        {lines}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-slate-800">Timeline</h3>
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('Day')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === 'Day' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setViewMode('Week')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === 'Week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Week
            </button>
            <button 
              onClick={() => setViewMode('Month')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${viewMode === 'Month' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Month
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (containerRef.current) {
                const todayOffset = differenceInDays(new Date(), minDate);
                containerRef.current.scrollLeft = Math.max(0, (todayOffset * cellWidth) - (containerRef.current.clientWidth / 2));
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Task List (Left Sidebar) */}
        <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white z-20 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="h-[60px] border-b border-slate-200 flex items-end px-4 pb-2 font-bold text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50">
            Task Name
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ height: `calc(100% - ${headerHeight}px)` }}>
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center px-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                style={{ height: rowHeight }}
                onClick={() => onTaskClick?.(task)}
              >
                <div className="truncate flex-1">
                  <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors truncate">{task.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Chart Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto relative bg-slate-50/30"
        >
          <div className="relative" style={{ width: days.length * cellWidth, minHeight: '100%' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm" style={{ height: headerHeight }}>
              {/* Months Row */}
              <div className="flex border-b border-slate-100 h-8">
                {months.map((m, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-center text-xs font-bold text-slate-600 border-r border-slate-100 bg-slate-50/80"
                    style={{ width: m.days.length * cellWidth }}
                  >
                    {m.month}
                  </div>
                ))}
              </div>
              {/* Days Row */}
              <div className="flex h-[27px]">
                {days.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  const isWknd = isWeekend(day);
                  return (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center justify-center border-r border-slate-100 ${isWknd ? 'bg-slate-50' : ''} ${isToday ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500'}`}
                      style={{ width: cellWidth }}
                    >
                      {viewMode === 'Day' && (
                        <span className="text-[10px]">{format(day, 'd')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid Background */}
            <div className="absolute top-[60px] bottom-0 left-0 right-0 flex pointer-events-none">
              {days.map((day, i) => {
                const isToday = isSameDay(day, new Date());
                const isWknd = isWeekend(day);
                return (
                  <div 
                    key={i} 
                    className={`border-r border-slate-100 h-full ${isWknd ? 'bg-slate-50/50' : ''} ${isToday ? 'bg-primary/5 border-primary/20' : ''}`}
                    style={{ width: cellWidth }}
                  />
                );
              })}
            </div>

            {/* Dependencies */}
            {renderDependencies()}

            {/* Task Bars */}
            <div className="relative" style={{ height: tasks.length * rowHeight }}>
              {tasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className="absolute border-b border-slate-100/50 w-full hover:bg-slate-50/50 transition-colors"
                  style={{ top: index * rowHeight, height: rowHeight }}
                >
                  <div 
                    className={`absolute rounded-md shadow-sm flex items-center overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 transition-all ${getStatusColor(task.status)}`}
                    style={getTaskStyle(task)}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* Progress Fill */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-black/20"
                      style={{ width: `${task.progress}%` }}
                    />
                    
                    {/* Task Label (if enough space) */}
                    {viewMode === 'Day' && (
                      <span className="relative z-10 text-[10px] font-bold text-white px-2 truncate drop-shadow-md">
                        {task.name}
                      </span>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      <p className="font-bold">{task.name}</p>
                      <p className="text-slate-300">{format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')} ({task.progress}%)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
