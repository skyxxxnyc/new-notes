import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Settings, Menu, ChevronLeft as ChevronLeftIcon } from 'lucide-react';

export default function CalendarView({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [showListOnMobile, setShowListOnMobile] = useState(true);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Middle Panel: Event List */}
      <section className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 bg-white flex-col ${showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <header className="p-4 md:p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2 md:mb-0">
            <button onClick={onToggleSidebar} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold">October 24</h2>
              <p className="text-slate-500 text-sm">Thursday, 2024</p>
            </div>
          </div>
          <div className="mt-2 md:mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search events" 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div 
            onClick={() => setShowListOnMobile(false)}
            className="p-4 rounded-xl border border-slate-100 hover:border-primary/30 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary rounded-full uppercase tracking-tight">Work</span>
              <span className="text-[10px] text-slate-400">10:00 AM</span>
            </div>
            <h4 className="font-semibold text-sm">Design Review: Swiss UI</h4>
            <p className="text-slate-500 text-xs mt-1 line-clamp-2">Presenting the final mockups for the calendar interaction states.</p>
          </div>
          <div 
            onClick={() => setShowListOnMobile(false)}
            className="p-4 rounded-xl border border-slate-100 hover:border-primary/30 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold py-0.5 px-2 bg-emerald-100 text-emerald-600 rounded-full uppercase tracking-tight">Personal</span>
              <span className="text-[10px] text-slate-400">12:30 PM</span>
            </div>
            <h4 className="font-semibold text-sm">Lunch with Alex</h4>
            <p className="text-slate-500 text-xs mt-1">Zunfthaus zur Waag, Zürich.</p>
          </div>
        </div>
      </section>

      {/* Right Panel: Calendar Grid */}
      <main className={`flex-1 bg-background-light flex-col ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <header className="h-auto min-h-20 py-4 px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 bg-white gap-4">
          <div className="flex items-center gap-2 md:gap-6 w-full md:w-auto">
            <button onClick={() => setShowListOnMobile(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary">
              <ChevronLeftIcon size={20} />
            </button>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex-1 md:flex-none">October 2024</h2>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button className="p-1.5 hover:bg-white rounded-md"><ChevronLeft size={20} /></button>
              <button className="p-1.5 hover:bg-white rounded-md"><ChevronRight size={20} /></button>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-100 rounded-lg p-1 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-2 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md hover:bg-white">Day</button>
              <button className="flex-1 md:flex-none px-2 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md hover:bg-white">Week</button>
              <button className="flex-1 md:flex-none px-2 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md bg-white shadow-sm">Month</button>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Settings size={20} /></button>
          </div>
        </header>
        
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="h-full min-h-[500px] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{day}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 bg-slate-50 gap-px">
              {/* Simplified calendar grid for visual representation */}
              {Array.from({length: 35}).map((_, i) => {
                const day = i - 1; // offset for starting day
                const isCurrentMonth = day > 0 && day <= 31;
                const isToday = day === 24;
                
                return (
                  <div key={i} className={`bg-white p-3 flex flex-col gap-1 ${!isCurrentMonth ? 'opacity-30' : ''} ${isToday ? 'ring-2 ring-primary ring-inset z-10 bg-primary/5' : ''}`}>
                    <span className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : 'text-slate-900'}`}>
                      {isCurrentMonth ? day : (day <= 0 ? 30 + day : day - 31)}
                    </span>
                    {day === 2 && <div className="py-1 px-2 text-[10px] bg-emerald-100 text-emerald-700 rounded border-l-2 border-emerald-500 truncate mt-1">Payment</div>}
                    {day === 8 && <div className="py-1 px-2 text-[10px] bg-primary/10 text-primary rounded border-l-2 border-primary truncate mt-1">Dev Sync</div>}
                    {isToday && (
                      <>
                        <div className="py-1 px-2 text-[10px] bg-primary text-white rounded truncate mt-1">Review</div>
                        <div className="py-1 px-2 text-[10px] bg-emerald-500 text-white rounded truncate mt-1">Lunch</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
