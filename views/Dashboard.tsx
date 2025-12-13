import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, MOCK_ANALYSIS_DATA, AssignmentConfig, PlagiarismGroup } from '../types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Award, Brain, Code, Activity, TrendingUp, AlertCircle, CheckCircle2, Edit2, Save, X, GitBranch, FileCode, ShieldCheck, FileText, Check, MinusCircle, Image as ImageIcon, Layers, Users, File, ShieldCheck as ShieldCheckIcon, ShieldAlert, ShieldQuestion, Mic, Send, Bot, User as UserIcon, Loader2, StopCircle, LayoutDashboard, MessageSquare, Scale, ScanSearch, Users2, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithGlobalAssistant, checkPlagiarism } from '../services/geminiService';

interface Props {
  analysisHistory: AnalysisResult[];
  assignmentConfig: AssignmentConfig;
}

// Simple Tab Component
const Tabs = ({ children, activeTab, onTabChange }: { children?: React.ReactNode, activeTab: string, onTabChange: (t: string) => void }) => {
  return (
    <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
       {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
             const element = child as React.ReactElement<{ value: string }>;
             return React.cloneElement(element, { 
               isActive: element.props.value === activeTab,
               onClick: () => onTabChange(element.props.value)
             } as any);
          }
          return child;
       })}
    </div>
  );
};

const Tab = ({ label, value, icon, isActive, onClick }: { label: string, value: string, icon?: React.ReactNode, isActive?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap
      ${isActive ? 'border-indigo-600 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const Dashboard: React.FC<Props> = ({ analysisHistory, assignmentConfig }) => {
  // Combine real analysis history with mock data for the cohort view
  const allData = [...analysisHistory, ...MOCK_ANALYSIS_DATA];

  // DASHBOARD MODES: 'grading' | 'assistant' | 'integrity'
  const [dashboardMode, setDashboardMode] = useState<'grading' | 'assistant' | 'integrity'>('grading');

  // GRADING VIEW STATES
  const [selectedStudent, setSelectedStudent] = useState<AnalysisResult>(allData[0]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState<AnalysisResult | null>(null);

  // INTEGRITY VIEW STATES
  const [plagiarismGroups, setPlagiarismGroups] = useState<PlagiarismGroup[]>([]);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);

  // ASSISTANT VIEW STATES
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'agent', text: string}[]>([
      { role: 'agent', text: `Hello Professor. I am your Agent. I have analyzed **${allData.length} submissions** for _"${assignmentConfig.title || 'the assignment'}"_. \n\nYou can ask me about:\n- Individual students\n- Class trends\n- How to navigate this dashboard` }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Update selected student if a new analysis comes in
  useEffect(() => {
    if (analysisHistory.length > 0) {
      setSelectedStudent(analysisHistory[0]);
    }
  }, [analysisHistory]);

  // --- PLAGIARISM CHECK LOGIC ---
  const handleRunPlagiarismCheck = async () => {
    setIsCheckingPlagiarism(true);
    const results = await checkPlagiarism(allData);
    setPlagiarismGroups(results);
    setIsCheckingPlagiarism(false);
  };

  // --- EDIT LOGIC ---
  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      setEditBuffer(null);
    } else {
      setEditBuffer(JSON.parse(JSON.stringify(selectedStudent)));
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editBuffer) {
      setSelectedStudent(editBuffer);
      setIsEditing(false);
      setEditBuffer(null);
    }
  };

  const updateScore = (field: keyof typeof selectedStudent.scores, value: number) => {
    if (!editBuffer) return;
    setEditBuffer({
      ...editBuffer,
      scores: { ...editBuffer.scores, [field]: value }
    });
  };

  const updateFeedback = (text: string) => {
    if (!editBuffer) return;
    setEditBuffer({ ...editBuffer, feedback: text });
  };

  const updateRubricScore = (index: number, newScore: number) => {
     if (!editBuffer) return;
     const newRubric = [...editBuffer.rubricBreakdown];
     newRubric[index] = { ...newRubric[index], score: newScore };
     setEditBuffer({ ...editBuffer, rubricBreakdown: newRubric });
  };

  const updateRubricComment = (index: number, newComment: string) => {
     if (!editBuffer) return;
     const newRubric = [...editBuffer.rubricBreakdown];
     newRubric[index] = { ...newRubric[index], comment: newComment };
     setEditBuffer({ ...editBuffer, rubricBreakdown: newRubric });
  };

  // --- VOICE & CHAT LOGIC ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let final = '';
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                if (final) {
                    setChatInput(prev => {
                        const prefix = prev && !prev.endsWith(' ') ? ' ' : '';
                        return prev + prefix + final;
                    });
                }
                setInterimTranscript(interim);
            };
            
            recognition.onerror = (event: any) => {
                console.error("Speech Recognition Error", event.error);
                if (event.error === 'not-allowed') {
                    alert("Please allow microphone access.");
                }
                setIsRecording(false);
                setInterimTranscript("");
            };

            recognition.onend = () => {
                 if (isRecording) {
                    setIsRecording(false);
                    setInterimTranscript("");
                 }
            };

            recognitionRef.current = recognition;
        }
    }
    
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, []); 

  const toggleRecording = () => {
      if (!recognitionRef.current) {
          alert("Voice recognition not supported.");
          return;
      }
      if (isRecording) {
          recognitionRef.current.stop();
          setIsRecording(false);
          setInterimTranscript("");
      } else {
          try {
              recognitionRef.current.start();
              setIsRecording(true);
          } catch (e) {
              setIsRecording(false);
          }
      }
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;

      const userMsg = chatInput;
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setChatInput("");
      setInterimTranscript("");
      setIsChatLoading(true);

      const response = await chatWithGlobalAssistant(userMsg, allData, assignmentConfig);

      setChatMessages(prev => [...prev, { role: 'agent', text: response }]);
      setIsChatLoading(false);
  };

  useEffect(() => {
      if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, dashboardMode, interimTranscript]);

  // Derived stats
  const averageOverall = Math.round(allData.reduce((acc, curr) => acc + (curr.scores?.overall || 0), 0) / (allData.length || 1));
  const averageEfficiency = Math.round(allData.reduce((acc, curr) => acc + (curr.scores?.aiEfficiency || 0), 0) / (allData.length || 1));
  const averageConfidence = Math.round(allData.reduce((acc, curr) => acc + (curr.confidenceScore || 0), 0) / (allData.length || 1));

  // Determine display data
  const displayData = isEditing && editBuffer ? editBuffer : selectedStudent;
  const scores = displayData.scores || { product: 0, process: 0, aiEfficiency: 0, overall: 0 };
  const insights = displayData.aiInsights || { summary: "No summary", efficiencyBand: "N/A" };
  const radarData = [
    { subject: 'Product', A: scores.product, fullMark: 100 },
    { subject: 'Process', A: scores.process, fullMark: 100 },
    { subject: 'AI Efficiency', A: scores.aiEfficiency, fullMark: 100 },
    { subject: 'Overall', A: scores.overall, fullMark: 100 },
  ];
  const codebaseData = displayData.codebaseVerification || {
      githubStructure: "Data not available",
      scriptQuality: "Data not available",
      readmeCredibility: "Data not available",
      overallCredibility: "Medium",
      fileAnalyses: []
  };
  const reportData = displayData.reportAnalysis || {
      structureQuality: "Analysis pending...",
      visualEvidence: "No visual analysis available.",
      criteriaMet: [],
      criteriaMissed: [],
      keyInferences: "No inferences available.",
      additionalEffort: "None detected."
  };

  // Helper for Confidence Badge
  const ConfidenceBadge = ({ score }: { score: number }) => {
    let color = "text-slate-400";
    let Icon = ShieldQuestion;
    if (score >= 80) { color = "text-green-600"; Icon = ShieldCheckIcon; }
    else if (score >= 50) { color = "text-yellow-600"; Icon = ShieldAlert; }
    else { color = "text-red-500"; Icon = AlertCircle; }

    return (
        <div className={`flex items-center text-xs font-semibold ${color}`} title={`AI Confidence: ${score}% (Based on available data)`}>
            <Icon size={14} className="mr-1" />
            {score}%
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      
      {/* Top Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Award className="text-yellow-600" />} label="Class Average" value={`${averageOverall}/100`} />
        <StatCard icon={<Brain className="text-purple-600" />} label="Avg AI Efficiency" value={`${averageEfficiency}%`} />
        <StatCard icon={<ShieldCheckIcon className="text-emerald-600" />} label="Avg AI Confidence" value={`${averageConfidence}%`} />
        <StatCard icon={<TrendingUp className="text-blue-600" />} label="Submissions" value={allData.length.toString()} />
      </div>

      {/* DASHBOARD MODE TOGGLE */}
      <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex w-full md:w-auto shadow-sm">
         <button 
           onClick={() => setDashboardMode('grading')}
           className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'grading' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
         >
           <LayoutDashboard size={16} className="mr-2" />
           Grading View
         </button>
         <button 
           onClick={() => setDashboardMode('integrity')}
           className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'integrity' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
         >
           <Scale size={16} className="mr-2" />
           Integrity Check
         </button>
         <button 
           onClick={() => setDashboardMode('assistant')}
           className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'assistant' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
         >
           <MessageSquare size={16} className="mr-2" />
           Agent Desk (Voice)
         </button>
      </div>

      {/* MODE: INTEGRITY CHECK */}
      {dashboardMode === 'integrity' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 min-h-[600px] flex flex-col p-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-600 mb-4">
                    <ScanSearch size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Academic Integrity Scanner</h2>
                <p className="text-slate-500 max-w-lg mx-auto mt-2">
                    Our AI cross-references the inferred logic, report structures, and specific error patterns across all {allData.length} submissions to identify potential collusion.
                </p>
                
                <button 
                    onClick={handleRunPlagiarismCheck}
                    disabled={isCheckingPlagiarism || allData.length < 2}
                    className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/25 transition disabled:opacity-50 flex items-center mx-auto"
                >
                    {isCheckingPlagiarism ? <Loader2 className="animate-spin mr-2" /> : <ShieldAlert className="mr-2" />}
                    {isCheckingPlagiarism ? "Scanning Submissions..." : "Run Cross-Check Analysis"}
                </button>
                {allData.length < 2 && <p className="text-xs text-red-400 mt-2">Need at least 2 students to compare.</p>}
            </div>

            {/* Results Area */}
            {plagiarismGroups.length > 0 ? (
                <div className="space-y-4 max-w-4xl mx-auto w-full">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <AlertTriangle className="text-red-500 mr-2" />
                        Suspicious Groups Detected ({plagiarismGroups.length})
                    </h3>
                    {plagiarismGroups.map((group, idx) => (
                        <div key={idx} className="bg-red-50 border border-red-100 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users2 size={64} className="text-red-900" />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                                <div className="md:w-1/3">
                                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Flagged Students</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {group.students.map((name, i) => (
                                            <span key={i} className="px-3 py-1 bg-white border border-red-200 text-red-800 font-semibold rounded-lg text-sm shadow-sm">
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-4 inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                                        {group.confidence} Confidence
                                    </div>
                                </div>
                                <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-red-200 pt-4 md:pt-0 md:pl-6">
                                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Detection Reasoning</h4>
                                    <p className="text-red-900 leading-relaxed text-sm">
                                        {group.reason}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                !isCheckingPlagiarism && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                        <CheckCircle2 size={48} className="mb-4 text-emerald-100" />
                        <p>No suspicious patterns detected yet.</p>
                        <p className="text-sm">Run the scanner to generate a report.</p>
                    </div>
                )
            )}
        </div>
      )}

      {/* MODE: CLASS ASSISTANT */}
      {dashboardMode === 'assistant' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-[600px] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
               <div className="flex items-center space-x-2">
                   <div className="bg-white/20 p-2 rounded-lg"><Bot size={24} /></div>
                   <div>
                       <h2 className="font-bold text-lg">Agent Desk</h2>
                       <p className="text-indigo-200 text-xs">Ask about students, class trends, or app FAQs</p>
                   </div>
               </div>
               <div className="text-indigo-200 text-xs text-right hidden sm:block">
                  <p>Model: Gemini 2.5 Flash</p>
                  <p>Context: Full Class Data</p>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[80%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mx-3 shadow-sm mt-1
                                ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}
                            `}>
                                {msg.role === 'user' ? <UserIcon size={20}/> : <Bot size={20}/>}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm md:text-base shadow-sm leading-relaxed
                                ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}
                            `}>
                                <ReactMarkdown 
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-2 space-y-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-2 space-y-1" {...props} />,
                                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-bold opacity-90" {...props} />,
                                        em: ({node, ...props}) => <em className="italic opacity-90" {...props} />,
                                        h1: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 mt-1" {...props} />,
                                        h2: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-1" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 uppercase tracking-wide opacity-80" {...props} />,
                                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-current pl-4 my-2 italic opacity-80" {...props} />,
                                        code: ({node, ...props}) => <code className="bg-black/10 rounded px-1 py-0.5 font-mono text-xs" {...props} />,
                                        a: ({node, ...props}) => <a className="underline hover:opacity-80 font-medium" {...props} />
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                
                {isChatLoading && (
                    <div className="flex w-full justify-start">
                        <div className="flex flex-row">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-indigo-600 border border-indigo-100 flex items-center justify-center mx-3 mt-1">
                                <Bot size={20}/>
                            </div>
                            <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none flex items-center space-x-3">
                                <Loader2 size={20} className="animate-spin text-indigo-500"/>
                                <span className="text-sm text-slate-500 font-medium">Analyzing class data...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
                {interimTranscript && (
                    <div className="mb-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 flex items-center animate-pulse shadow-sm">
                        <Mic size={16} className="mr-2" />
                        <span className="font-bold mr-1">Hearing:</span> "{interimTranscript}..."
                    </div>
                )}
                <div className="flex items-center space-x-3 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={isRecording ? "Listening..." : "Try: 'Compare Sarah and Marcus' or 'Where is the Rubric?'"}
                            className={`w-full pl-5 pr-12 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 outline-none text-base shadow-sm transition-all
                                ${isRecording ? 'border-red-400 bg-red-50 text-red-700 placeholder:text-red-400' : 'border-slate-300'}
                            `}
                        />
                        <button 
                            onClick={toggleRecording}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all
                                ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}
                            `}
                            title={isRecording ? "Stop Recording" : "Start Voice Input"}
                        >
                            {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                        </button>
                    </div>
                    <button 
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition transform active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODE: GRADING VIEW (Existing Logic) */}
      {dashboardMode === 'grading' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2">
        
        {/* Sidebar List */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit max-h-[800px] overflow-y-auto">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex items-center sticky top-0 z-10">
            <Users size={18} className="mr-2 text-indigo-600"/>
            Students ({allData.length})
          </div>
          <div className="p-2 space-y-2">
            {allData.map((student, idx) => (
              <div 
                key={idx}
                onClick={() => {
                     if (!isEditing) setSelectedStudent(student);
                }}
                className={`p-3 rounded-lg cursor-pointer transition flex flex-col space-y-2 group relative border
                  ${selectedStudent?.studentName === student.studentName ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white hover:bg-slate-50 border-transparent'}
                  ${isEditing ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <div className="flex justify-between items-center w-full">
                    <div>
                        <div className={`font-medium ${selectedStudent?.studentName === student.studentName ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {student.studentName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{student.aiInsights?.efficiencyBand || "Unknown"}</div>
                    </div>
                    <div className={`text-sm font-bold px-2 py-1 rounded-md ${
                        (student.scores?.overall || 0) >= 80 ? 'bg-green-50 text-green-700' : 
                        (student.scores?.overall || 0) >= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'
                    }`}>
                        {student.scores?.overall || 0}
                    </div>
                </div>
                
                {/* Confidence Indicator in Sidebar */}
                <div className="flex justify-between items-center w-full border-t border-slate-100 pt-2 mt-1">
                   <ConfidenceBadge score={student.confidenceScore || 50} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Main View */}
        <div className="lg:col-span-9 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[600px]">
           
           {/* Header with Edit Controls */}
           <div className="flex justify-between items-start mb-4">
               <div>
                 <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-slate-900">{displayData.studentName}</h2>
                    {/* Confidence Score Badge Main Header */}
                    <div className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <ConfidenceBadge score={displayData.confidenceScore || 50} />
                    </div>
                 </div>
                 <p className="text-slate-500 text-sm mt-1">{insights.summary}</p>
                 {isEditing && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded mt-2 inline-block">Editing Mode</span>}
               </div>
               <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                       <button onClick={handleEditToggle} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"><X size={18} /></button>
                       <button onClick={handleSaveEdit} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium"><Save size={18} /><span>Save</span></button>
                    </>
                  ) : (
                    <button onClick={handleEditToggle} className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition text-sm font-medium"><Edit2 size={16} /><span>Edit</span></button>
                  )}
               </div>
           </div>

           <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
              <Tab value="overview" label="Overview" icon={<Activity size={16}/>} />
              <Tab value="codebase" label="GitHub Review" icon={<Code size={16}/>} />
              <Tab value="report" label="Report Analysis" icon={<FileText size={16}/>} />
              <Tab value="rubric" label="Rubric" icon={<Layers size={16}/>} />
           </Tabs>

           <div className="mt-4 flex-1">
             
             {/* --- OVERVIEW TAB --- */}
             {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
                   <div className="space-y-6">
                      <div className="h-64 border rounded-xl bg-slate-50/50 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name={displayData.studentName} dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-4">
                        <ScoreRow label="Product Quality" value={scores.product} color="bg-blue-500" isEditing={isEditing} onChange={(v) => updateScore('product', v)} />
                        <ScoreRow label="Process & Ownership" value={scores.process} color="bg-purple-500" isEditing={isEditing} onChange={(v) => updateScore('process', v)}/>
                        <ScoreRow label="AI Efficiency" value={scores.aiEfficiency} color="bg-emerald-500" isEditing={isEditing} onChange={(v) => updateScore('aiEfficiency', v)}/>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className={`rounded-xl p-6 text-white h-full ${isEditing ? 'bg-indigo-800' : 'bg-indigo-900'} shadow-md min-h-[250px]`}>
                        <h3 className="font-semibold text-lg mb-4 flex items-center"><Brain className="w-5 h-5 mr-2 text-indigo-300" /> Professor's Feedback</h3>
                        {isEditing ? (
                            <textarea value={displayData.feedback} onChange={(e) => updateFeedback(e.target.value)} className="w-full h-64 bg-indigo-950/50 text-indigo-50 border border-indigo-500/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
                        ) : (
                            <div className="text-indigo-100 leading-relaxed text-sm md:text-base prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown 
                                components={{
                                  strong: ({node, ...props}) => <span className="font-bold text-white" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-1" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal ml-4 space-y-1" {...props} />,
                                }}
                              >
                                {displayData.feedback || "No feedback provided."}
                              </ReactMarkdown>
                            </div>
                        )}
                      </div>
                   </div>
                </div>
             )}

             {/* --- CODEBASE TAB --- */}
             {activeTab === 'codebase' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                             <GitBranch size={16} className="mr-2 text-indigo-500" /> Structure Analysis
                          </div>
                          <p className="text-sm text-slate-600">{codebaseData.githubStructure}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                             <ShieldCheck size={16} className="mr-2 text-indigo-500" /> Credibility Assessment
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-sm text-slate-600">Readme: {codebaseData.readmeCredibility}</span>
                             <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${codebaseData.overallCredibility === 'High' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {codebaseData.overallCredibility} Confidence
                             </span>
                          </div>
                      </div>
                  </div>

                  <div>
                     <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                        <FileCode className="mr-2 text-indigo-600" size={20} />
                        Detailed File Review
                     </h3>
                     <div className="space-y-3">
                        {codebaseData.fileAnalyses && codebaseData.fileAnalyses.length > 0 ? (
                           codebaseData.fileAnalyses.map((file, idx) => (
                             <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                                <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center font-mono text-sm font-bold text-slate-800">
                                     <File size={14} className="mr-2 text-slate-400" />
                                     {file.fileName}
                                   </div>
                                   <Badge rating={file.rating} />
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">
                                   {file.critique}
                                </p>
                             </div>
                           ))
                        ) : (
                           <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400">
                              No specific files were analyzed. Check if GitHub URL is correct.
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             )}

             {/* --- REPORT TAB --- */}
             {activeTab === 'report' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                   <div className="space-y-6">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                         <h4 className="flex items-center text-sm font-bold text-slate-800 mb-2"><Layers size={16} className="mr-2 text-indigo-500"/> Structure</h4>
                         <p className="text-sm text-slate-600">{reportData.structureQuality}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                         <h4 className="flex items-center text-sm font-bold text-slate-800 mb-2"><ImageIcon size={16} className="mr-2 text-indigo-500"/> Visual Evidence</h4>
                         <p className="text-sm text-slate-600 italic">"{reportData.visualEvidence}"</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                        <div className="flex items-center text-xs font-bold text-green-700 uppercase mb-2"><CheckCircle2 size={14} className="mr-1" /> Met Criteria</div>
                        <ul className="space-y-1">{reportData.criteriaMet && reportData.criteriaMet.length > 0 ? reportData.criteriaMet.map((c, i) => <li key={i} className="flex items-start text-sm text-slate-700"><Check size={14} className="mr-2 mt-0.5 text-green-500 flex-shrink-0" />{c}</li>) : <li className="text-sm text-slate-400">None</li>}</ul>
                      </div>
                      <div>
                        <div className="flex items-center text-xs font-bold text-red-700 uppercase mb-2"><MinusCircle size={14} className="mr-1" /> Missed / Weak</div>
                        <ul className="space-y-1">{reportData.criteriaMissed && reportData.criteriaMissed.length > 0 ? reportData.criteriaMissed.map((c, i) => <li key={i} className="flex items-start text-sm text-slate-700"><X size={14} className="mr-2 mt-0.5 text-red-500 flex-shrink-0" />{c}</li>) : <li className="text-sm text-slate-400">None</li>}</ul>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg mt-2">
                          <div className="text-xs font-bold text-indigo-700 uppercase mb-1">Key Inference</div>
                          <p className="text-sm text-indigo-900">{reportData.keyInferences}</p>
                      </div>
                   </div>
                </div>
             )}

             {/* --- RUBRIC TAB --- */}
             {activeTab === 'rubric' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                   {displayData.rubricBreakdown ? displayData.rubricBreakdown.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                         <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-slate-800">{item.criteria}</span>
                            {isEditing ? (
                              <div className="flex items-center space-x-1">
                                 <input type="number" min={0} max={item.max} value={item.score} onChange={(e) => updateRubricScore(idx, parseInt(e.target.value))} className="w-12 text-center text-sm font-bold bg-white border border-slate-300 rounded p-1" />
                                 <span className="text-slate-400 text-sm">/ {item.max}</span>
                              </div>
                            ) : (
                              <span className={`text-sm font-bold px-3 py-1 rounded ${item.score === item.max ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{item.score}/{item.max} Points</span>
                            )}
                         </div>
                         {isEditing ? (
                           <input type="text" value={item.comment} onChange={(e) => updateRubricComment(idx, e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1" />
                         ) : (
                           <p className="text-sm text-slate-600">{item.comment}</p>
                         )}
                      </div>
                   )) : <div className="text-slate-500 text-sm">No rubric data.</div>}
                </div>
             )}

           </div>
        </div>
      </div>
      )}
    </div>
  );
};

const Badge = ({ rating }: { rating: string }) => {
  let colorClass = 'bg-slate-100 text-slate-600';
  if (rating === 'Excellent') colorClass = 'bg-green-100 text-green-700';
  if (rating === 'Good') colorClass = 'bg-blue-100 text-blue-700';
  if (rating === 'Fair') colorClass = 'bg-yellow-100 text-yellow-700';
  if (rating === 'Poor') colorClass = 'bg-red-100 text-red-700';

  return <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${colorClass}`}>{rating}</span>;
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
    <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
    <div>
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  </div>
);

const ScoreRow = ({ label, value, color, isEditing, onChange }: { label: string, value: number, color: string, isEditing?: boolean, onChange?: (val: number) => void }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-slate-700">{label}</span>
      {isEditing ? (
         <input type="number" min="0" max="100" value={value} onChange={(e) => onChange && onChange(parseInt(e.target.value))} className="w-14 text-right font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded px-1" />
      ) : (
        <span className="font-bold text-slate-900">{value}%</span>
      )}
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);