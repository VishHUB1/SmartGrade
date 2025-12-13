import React, { useState } from 'react';
import { BrainCircuit, BookOpen, User, BarChart3, Settings, Menu, ChevronLeft, Bot } from 'lucide-react';
import { AppStage, UserProfile } from '../types';

interface LayoutProps {
  currentStage: AppStage;
  setStage: (stage: AppStage) => void;
  children: React.ReactNode;
  user: UserProfile | null;
}

export const Layout: React.FC<LayoutProps> = ({ currentStage, setStage, children, user }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      {/* Sidebar - Modern White with Vibrant Accents */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-slate-200 flex-shrink-0 flex flex-col transition-all duration-300 relative z-20 shadow-xl shadow-slate-200/50`}
      >
        <div 
          onClick={() => setStage(AppStage.LANDING)}
          className="h-20 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition border-b border-slate-100"
        >
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                <BrainCircuit className="w-6 h-6" />
             </div>
             {isSidebarOpen && <span className="font-bold text-2xl tracking-tight text-indigo-950 animate-in fade-in duration-200">IntegrityLens</span>}
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-x-hidden">
          <NavItem 
            icon={<Settings size={20} />} 
            label="Instructor Setup" 
            active={currentStage === AppStage.INSTRUCTOR_SETUP}
            onClick={() => setStage(AppStage.INSTRUCTOR_SETUP)}
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<User size={20} />} 
            label="Student Submission" 
            active={currentStage === AppStage.STUDENT_SUBMISSION}
            onClick={() => setStage(AppStage.STUDENT_SUBMISSION)}
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="Grading Dashboard" 
            active={currentStage === AppStage.DASHBOARD}
            onClick={() => setStage(AppStage.DASHBOARD)}
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Bot size={20} />} 
            label="Agent Desk" 
            active={currentStage === AppStage.GRADING_ASSISTANT}
            onClick={() => setStage(AppStage.GRADING_ASSISTANT)}
            collapsed={!isSidebarOpen}
          />
        </nav>

        {isSidebarOpen && (
          <div className="p-6 border-t border-slate-100 animate-in fade-in duration-300 bg-slate-50/50 mt-auto">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">System Status</div>
                <div className="flex items-center text-sm text-indigo-900 font-semibold">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
                Gemini 2.5 Active
                </div>
                <div className="text-[10px] text-indigo-400 mt-2">v1.0.3 Beta</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen bg-slate-50/50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
          <div className="flex items-center">
            {/* Toggle Button */}
            <button 
               className="mr-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
               onClick={toggleSidebar}
            >
               <Menu size={20}/>
            </button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 truncate">
              {currentStage === AppStage.INSTRUCTOR_SETUP && "Assignment Configuration"}
              {currentStage === AppStage.STUDENT_SUBMISSION && "Submission Portal"}
              {currentStage === AppStage.DASHBOARD && "Analytics & Grading"}
              {currentStage === AppStage.GRADING_ASSISTANT && "Agent Desk"}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right hidden sm:block">
              <div className="font-bold text-slate-700">{user?.name || "Guest"}</div>
              <div className="text-slate-500 text-xs">{user?.email || "Computer Science Dept."}</div>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold shadow-md shadow-indigo-200">
              {user?.avatarInitials || "U"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 relative">
           <div className="max-w-7xl mx-auto w-full h-full">
            {children}
           </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group mb-1
      ${active 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 transform scale-[1.02]' 
        : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}
      ${collapsed ? 'justify-center' : ''}
    `}
  >
    <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`}>
      {icon}
    </div>
    {!collapsed && <span className="ml-3 truncate text-sm font-medium">{label}</span>}
  </button>
);