import React, { useState } from 'react';
import { Search, MoreVertical, Plus, Circle, Clock, Menu, ChevronLeft } from 'lucide-react';

export default function TasksView({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [showListOnMobile, setShowListOnMobile] = useState(true);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Middle Panel: Task Lists */}
      <section className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 flex-col ${showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <button onClick={onToggleSidebar} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary">
            <Menu size={20} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search lists..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div 
            onClick={() => setShowListOnMobile(false)}
            className="p-3 rounded-lg bg-white shadow-sm border-l-4 border-primary cursor-pointer"
          >
            <h3 className="text-sm font-bold truncate">Project Alpha: Task List</h3>
            <p className="text-xs text-slate-500 mt-1">Last edited 2 mins ago</p>
          </div>
          <div 
            onClick={() => setShowListOnMobile(false)}
            className="p-3 rounded-lg hover:bg-white cursor-pointer group"
          >
            <h3 className="text-sm font-medium text-slate-700 group-hover:text-primary truncate">Marketing Strategy 2024</h3>
            <p className="text-xs text-slate-400 mt-1">Yesterday</p>
          </div>
        </div>
      </section>

      {/* Right Panel: Task Board */}
      <main className={`flex-1 bg-white flex-col relative overflow-y-auto ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 px-4 md:px-8 py-4 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowListOnMobile(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-base md:text-lg font-bold tracking-tight truncate">Project Alpha</h2>
            <div className="h-4 w-px bg-slate-200"></div>
            <nav className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm font-semibold text-primary border-b-2 border-primary py-4 -mb-4">List</span>
              <span className="text-xs md:text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer">Board</span>
            </nav>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <MoreVertical size={20} />
          </button>
        </header>

        <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-6 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Task List</h1>
              <p className="text-slate-500 font-medium mt-2 text-sm md:text-base">Updated 2 minutes ago by Sarah Jenkins</p>
            </div>
            <button className="bg-primary/10 text-primary px-5 py-2 rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 w-full md:w-auto">
              <Plus size={18} /> Add New Task
            </button>
          </div>

          {/* Progress */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-12">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-900">Overall Progress</span>
              <span className="text-2xl font-black text-primary">65%</span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary w-[65%]"></div>
            </div>
            <div className="flex justify-between text-sm text-slate-500 font-medium">
              <span>13 of 20 tasks completed</span>
              <span>7 remaining</span>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="text-orange-500" size={20} />
                <h3 className="font-bold text-slate-900">Active Sprint</h3>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
                <div className="size-5 rounded border-2 border-orange-500 flex items-center justify-center">
                  <div className="size-2 bg-orange-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Refactor core authentication module</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded">In Progress</span>
                    <span className="text-xs text-slate-400">Due Oct 24</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Circle className="text-slate-400" size={20} />
                <h3 className="font-bold text-slate-900">Backlog</h3>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-white border border-slate-100 rounded-xl flex items-center gap-4 cursor-pointer hover:border-primary/30">
                  <div className="size-5 rounded border-2 border-slate-300"></div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-600">Design mobile responsiveness for dashboard</p>
                  </div>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-xl flex items-center gap-4 cursor-pointer hover:border-primary/30">
                  <div className="size-5 rounded border-2 border-slate-300"></div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-600">Update API documentation for v2.4 release</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
