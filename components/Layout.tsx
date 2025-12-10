import React from 'react';
import { BrainCircuit, BookOpen, User, BarChart3, Settings } from 'lucide-react';
import { AppStage } from '../types';

interface LayoutProps {
  currentStage: AppStage;
  setStage: (stage: AppStage) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentStage, setStage, children }) => {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-700">
          <BrainCircuit className="w-8 h-8 text-indigo-400" />
          <span className="ml-3 font-bold text-lg hidden lg:block tracking-tight">AI-Lens</span>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2">
          <NavItem 
            icon={<Settings size={20} />} 
            label="Instructor Setup" 
            active={currentStage === AppStage.INSTRUCTOR_SETUP}
            onClick={() => setStage(AppStage.INSTRUCTOR_SETUP)}
          />
          <NavItem 
            icon={<User size={20} />} 
            label="Student Submission" 
            active={currentStage === AppStage.STUDENT_SUBMISSION}
            onClick={() => setStage(AppStage.STUDENT_SUBMISSION)}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="Grading Dashboard" 
            active={currentStage === AppStage.DASHBOARD}
            onClick={() => setStage(AppStage.DASHBOARD)}
          />
        </nav>

        <div className="p-4 border-t border-slate-700 hidden lg:block">
          <div className="text-xs text-slate-400">v1.0.2 Beta</div>
          <div className="text-xs text-slate-500 mt-1">Powered by Gemini 2.5</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            {currentStage === AppStage.INSTRUCTOR_SETUP && "Assignment Configuration"}
            {currentStage === AppStage.STUDENT_SUBMISSION && "Submission Portal"}
            {currentStage === AppStage.DASHBOARD && "Analytics & Grading"}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right hidden sm:block">
              <div className="font-medium">Prof. Alistair Vance</div>
              <div className="text-slate-500 text-xs">Computer Science Dept.</div>
            </div>
            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
              AV
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
           <div className="max-w-7xl mx-auto w-full">
            {children}
           </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 group
      ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
    `}
  >
    <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
      {icon}
    </div>
    <span className="ml-3 font-medium hidden lg:block">{label}</span>
  </button>
);
