import React, { useState } from 'react';
import { BrainCircuit, Search, Zap, ArrowRight, ShieldCheck, X, User, Lock, Mail, ChevronRight, FileText, MessageSquare, Database, LineChart, Code } from 'lucide-react';

interface Props {
  onLogin: (name: string, email: string) => void;
}

export const LandingPage: React.FC<Props> = ({ onLogin }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('Prof. Alistair Vance');
  const [email, setEmail] = useState('professor@university.edu');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onLogin(name, email);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col relative">
      
      {/* Navbar */}
      <nav className="px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center space-x-3">
          <BrainCircuit className="w-8 h-8 text-indigo-400" />
          <span className="font-bold text-xl tracking-tight">IntegrityLens</span>
        </div>
        <button 
          onClick={() => { setShowLogin(true); setIsRegister(false); }}
          className="text-sm font-medium text-slate-300 hover:text-white transition"
        >
          Log In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap size={12} className="mr-1" />
            Next-Gen Academic Grading
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Grade the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Journey</span>, <br />
            Not Just the Destination.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            IntegrityLens goes beyond the final code output. We analyze the student's development process, 
            Git history, and AI interaction logs to assess <strong>true understanding</strong> and <strong>ownership</strong>.
          </p>

          <div className="pt-8">
            <button 
              onClick={() => setShowLogin(true)} 
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-indigo-600 rounded-full overflow-hidden transition-all hover:bg-indigo-500 hover:scale-105 shadow-xl hover:shadow-indigo-500/25"
            >
              <span>Initialize Platform</span>
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
            </button>
            <p className="mt-4 text-sm text-slate-500">v1.0.3 Beta • Powered by Gemini 2.5</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-slate-950 py-24 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold mb-4">Powerful Features for Modern Educators</h2>
             <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to assess authentic learning in the age of AI.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            
            <FeatureCard 
              icon={<FileText className="w-8 h-8 text-blue-400" />}
              title="AI Powered Report Evaluation"
              description="Evaluates student reports against defined rubrics, checking for structure, visual evidence, and critical reasoning."
            />

            <FeatureCard 
              icon={<Code className="w-8 h-8 text-indigo-400" />}
              title="GitHub Code Analysis"
              description="Connects directly to repositories to analyze commit structure, file organization, and coding patterns for authenticity."
            />

            <FeatureCard 
              icon={<LineChart className="w-8 h-8 text-purple-400" />}
              title="Prompt Analysis (AI Efficiency)"
              description="Analyses student AI prompt logs to determine if they used AI as a smart co-pilot or just for copy-pasting."
            />
            
            <FeatureCard 
              icon={<MessageSquare className="w-8 h-8 text-pink-400" />}
              title="Agent Desk" 
              description="A conversational agent that answers questions about class performance, specific students, and grading trends."
            />
            
            <FeatureCard 
              icon={<Database className="w-8 h-8 text-emerald-400" />}
              title="Google Forms Integration"
              description="Seamlessly import bulk student submissions, including Drive links and PDF attachments, via Google Apps Script."
            />

          </div>
        </div>
      </div>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setShowLogin(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
            
            <div className="px-8 py-10">
              <div className="text-center mb-8">
                 <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                    {isRegister ? <User size={24} /> : <Lock size={24} />}
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800">{isRegister ? "Create Account" : "Welcome Back"}</h2>
                 <p className="text-slate-500 text-sm mt-1">{isRegister ? "Join the future of academic assessment." : "Sign in to access your grading dashboard."}</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Prof. Name"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        required
                      />
                    </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="professor@university.edu"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      required
                    />
                  </div>
                </div>

                {!isRegister && (
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                    </div>
                    </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition transform active:scale-95 flex items-center justify-center mt-6"
                >
                  {isRegister ? "Create Account" : "Sign In"}
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </form>

              <div className="mt-6 text-center pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  {isRegister ? "Already have an account?" : "Don't have an account yet?"}
                  <button 
                    onClick={() => setIsRegister(!isRegister)}
                    className="ml-2 font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    {isRegister ? "Sign In" : "Register"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors w-full h-full">
    <div className="mb-4 p-3 bg-slate-950 rounded-xl inline-block border border-slate-800">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
  </div>
);