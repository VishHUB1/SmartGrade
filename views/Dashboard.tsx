import React, { useState, useEffect } from 'react';
import { AnalysisResult, MOCK_ANALYSIS_DATA } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Award, Brain, Code, Activity, TrendingUp, AlertCircle, CheckCircle2, Edit2, Save, X, GitBranch, FileCode, Search, ShieldCheck, FileText, Check, MinusCircle, Image as ImageIcon, Layers, Users } from 'lucide-react';

interface Props {
  analysisHistory: AnalysisResult[];
}

export const Dashboard: React.FC<Props> = ({ analysisHistory }) => {
  // Combine real analysis history with mock data for the cohort view
  // Real data comes first
  const allData = [...analysisHistory, ...MOCK_ANALYSIS_DATA];

  const [selectedStudent, setSelectedStudent] = useState<AnalysisResult>(allData[0]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Update selected student if a new analysis comes in at the top of the list
  useEffect(() => {
    if (analysisHistory.length > 0) {
      setSelectedStudent(analysisHistory[0]);
    }
  }, [analysisHistory]);

  // Local state for editing the selected student's data
  const [editBuffer, setEditBuffer] = useState<AnalysisResult | null>(null);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit
      setIsEditing(false);
      setEditBuffer(null);
    } else {
      // Start edit
      setEditBuffer(JSON.parse(JSON.stringify(selectedStudent)));
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editBuffer) {
      setSelectedStudent(editBuffer);
      // In a real app, we would update the `allData` or send to backend here
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

  // Determine which data to display (original or edited buffer)
  const displayData = isEditing && editBuffer ? editBuffer : selectedStudent;
  
  // Fallbacks for data structures that might not be in older mock data (safety check)
  const codebaseData = displayData.codebaseVerification || {
      githubStructure: "Data not available",
      scriptQuality: "Data not available",
      readmeCredibility: "Data not available",
      overallCredibility: "Medium"
  };

  const reportData = displayData.reportAnalysis || {
      structureQuality: "Analysis pending...",
      visualEvidence: "No visual analysis available.",
      criteriaMet: [],
      criteriaMissed: [],
      keyInferences: "No inferences available.",
      additionalEffort: "None detected."
  };

  // Derived stats
  const averageOverall = Math.round(allData.reduce((acc, curr) => acc + curr.scores.overall, 0) / allData.length);
  const averageProcess = Math.round(allData.reduce((acc, curr) => acc + curr.scores.process, 0) / allData.length);

  const radarData = [
    { subject: 'Product', A: displayData.scores.product, fullMark: 100 },
    { subject: 'Process', A: displayData.scores.process, fullMark: 100 },
    { subject: 'AI Efficiency', A: displayData.scores.aiEfficiency, fullMark: 100 },
    { subject: 'Overall', A: displayData.scores.overall, fullMark: 100 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Award className="text-yellow-600" />} label="Class Average" value={`${averageOverall}/100`} />
        <StatCard icon={<Brain className="text-purple-600" />} label="Avg AI Efficiency" value={`${Math.round(allData.reduce((a,c)=>a+c.scores.aiEfficiency,0)/allData.length)}%`} />
        <StatCard icon={<Activity className="text-blue-600" />} label="Process Focus" value={`${averageProcess}%`} />
        <StatCard icon={<TrendingUp className="text-green-600" />} label="Submissions" value={allData.length.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex items-center">
            <Users size={18} className="mr-2 text-indigo-600"/>
            Student Cohort ({allData.length})
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {allData.map((student, idx) => (
              <div 
                key={idx}
                onClick={() => !isEditing && setSelectedStudent(student)}
                className={`p-3 rounded-lg cursor-pointer transition flex justify-between items-center group
                  ${selectedStudent.studentName === student.studentName ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'hover:bg-slate-50 border border-transparent'}
                  ${isEditing ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <div>
                  <div className={`font-medium ${selectedStudent.studentName === student.studentName ? 'text-indigo-900' : 'text-slate-900'}`}>
                    {student.studentName}
                  </div>
                  <div className="text-xs text-slate-500">{student.aiInsights.efficiencyBand}</div>
                </div>
                <div className={`text-lg font-bold px-2 py-1 rounded-md ${
                    student.scores.overall >= 80 ? 'bg-green-50 text-green-700' : 
                    student.scores.overall >= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'
                  }`}>
                  {student.scores.overall}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Score Card */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden transition-all duration-300 ${isEditing ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}>
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10"></div>
             
             {/* Edit Controls */}
             <div className="absolute top-6 right-6 z-20 flex space-x-2">
                {isEditing ? (
                  <>
                     <button onClick={handleEditToggle} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition" title="Cancel">
                        <X size={18} />
                     </button>
                     <button onClick={handleSaveEdit} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-medium">
                        <Save size={18} />
                        <span>Save Verification</span>
                     </button>
                  </>
                ) : (
                  <button onClick={handleEditToggle} className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition text-sm font-medium">
                     <Edit2 size={16} />
                     <span>Verify & Edit Analysis</span>
                  </button>
                )}
             </div>

             <div className="flex justify-between items-start relative z-10">
               <div>
                 <h2 className="text-2xl font-bold text-slate-900">{displayData.studentName}</h2>
                 <p className="text-slate-500 text-sm mt-1">{displayData.aiInsights.summary}</p>
                 {isEditing && (
                    <div className="inline-block mt-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-semibold animate-pulse">
                      Editing Mode Active
                    </div>
                 )}
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="h-64">
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
                <div className="flex flex-col justify-center space-y-4">
                   <ScoreRow label="Product Quality" value={displayData.scores.product} color="bg-blue-500" isEditing={isEditing} onChange={(v) => updateScore('product', v)} />
                   <ScoreRow label="Process & Ownership" value={displayData.scores.process} color="bg-purple-500" isEditing={isEditing} onChange={(v) => updateScore('process', v)}/>
                   <ScoreRow label="AI Efficiency" value={displayData.scores.aiEfficiency} color="bg-emerald-500" isEditing={isEditing} onChange={(v) => updateScore('aiEfficiency', v)}/>
                   
                   {isEditing && (
                     <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Override Overall Score</label>
                        <input 
                           type="number" 
                           value={displayData.scores.overall}
                           onChange={(e) => updateScore('overall', parseInt(e.target.value))}
                           className="mt-1 w-20 px-2 py-1 text-lg font-bold border border-slate-300 rounded text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                     </div>
                   )}
                   
                   {!isEditing && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">AI Prompt Quality</div>
                        <div className="text-sm font-medium text-slate-800 flex items-center">
                          {displayData.aiInsights.promptQuality === 'High' ? <CheckCircle2 size={16} className="text-green-500 mr-2"/> : <AlertCircle size={16} className="text-yellow-500 mr-2"/>}
                          {displayData.aiInsights.promptQuality}
                        </div>
                    </div>
                   )}
                </div>
             </div>
          </div>

          {/* Report Deep Dive Analysis (New) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                Report & Documentation Deep Dive
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Left Column */}
               <div className="space-y-6">
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                        <Layers size={16} className="mr-2 text-indigo-500" />
                        Structure & Flow
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{reportData.structureQuality}</p>
                   </div>
                   
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                        <ImageIcon size={16} className="mr-2 text-indigo-500" />
                        Visual Evidence Analysis
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">"{reportData.visualEvidence}"</p>
                   </div>
               </div>

               {/* Right Column - Criteria Lists */}
               <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-xs font-bold text-green-700 uppercase mb-2">
                       <CheckCircle2 size={14} className="mr-1" /> Criteria Met
                    </div>
                    <ul className="space-y-1">
                      {reportData.criteriaMet.length > 0 ? reportData.criteriaMet.map((c, i) => (
                        <li key={i} className="flex items-start text-sm text-slate-700">
                          <Check size={14} className="mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                          {c}
                        </li>
                      )) : <li className="text-sm text-slate-400">None detected</li>}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center text-xs font-bold text-red-700 uppercase mb-2">
                       <MinusCircle size={14} className="mr-1" /> Criteria Missed / Weak
                    </div>
                    <ul className="space-y-1">
                      {reportData.criteriaMissed.length > 0 ? reportData.criteriaMissed.map((c, i) => (
                        <li key={i} className="flex items-start text-sm text-slate-700">
                          <X size={14} className="mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                          {c}
                        </li>
                      )) : <li className="text-sm text-slate-400">None detected</li>}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Key Inference</div>
                      <p className="text-sm text-indigo-900 bg-indigo-50 p-2 rounded">{reportData.keyInferences}</p>
                  </div>
                   {reportData.additionalEffort && reportData.additionalEffort !== "None detected." && (
                      <div className="mt-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Additional Work</div>
                          <p className="text-sm text-purple-900 bg-purple-50 p-2 rounded">{reportData.additionalEffort}</p>
                      </div>
                   )}
               </div>
             </div>
          </div>

          {/* Codebase Verification Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                Codebase Verification & Credibility
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <div className="flex items-center text-sm font-semibold text-slate-700 mb-1">
                        <GitBranch size={16} className="mr-2 text-indigo-500" />
                        GitHub Structure
                     </div>
                     <p className="text-sm text-slate-600">{codebaseData.githubStructure}</p>
                  </div>
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <div className="flex items-center text-sm font-semibold text-slate-700 mb-1">
                        <FileCode size={16} className="mr-2 text-indigo-500" />
                        Script Quality
                     </div>
                     <p className="text-sm text-slate-600">{codebaseData.scriptQuality}</p>
                  </div>
               </div>
               <div className="space-y-4">
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <div className="flex items-center text-sm font-semibold text-slate-700 mb-1">
                        <Search size={16} className="mr-2 text-indigo-500" />
                        README Credibility
                     </div>
                     <p className="text-sm text-slate-600">{codebaseData.readmeCredibility}</p>
                  </div>
                  <div className={`p-3 rounded-lg border flex items-center justify-between
                      ${codebaseData.overallCredibility === 'High' ? 'bg-green-50 border-green-200 text-green-700' : 
                        codebaseData.overallCredibility === 'Low' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}
                  `}>
                     <span className="font-semibold text-sm">Overall Credibility</span>
                     <span className="font-bold text-lg">{codebaseData.overallCredibility}</span>
                  </div>
               </div>
             </div>
          </div>

          {/* Rubric Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center">
                <Code className="w-5 h-5 mr-2 text-indigo-600" />
                Rubric Breakdown
             </h3>
             <div className="space-y-4">
                {displayData.rubricBreakdown.map((item, idx) => (
                  <div key={idx} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-700">{item.criteria}</span>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                           <input 
                              type="number" 
                              min={0} max={item.max}
                              value={item.score}
                              onChange={(e) => updateRubricScore(idx, parseInt(e.target.value))}
                              className="w-12 text-center text-sm font-bold bg-slate-50 border border-slate-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                           />
                           <span className="text-slate-400 text-sm">/ {item.max}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{item.score}/{item.max}</span>
                      )}
                    </div>
                    {isEditing ? (
                      <input 
                         type="text"
                         value={item.comment}
                         onChange={(e) => updateRubricComment(idx, e.target.value)}
                         className="w-full text-sm text-slate-600 border border-slate-200 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">{item.comment}</p>
                    )}
                  </div>
                ))}
             </div>
          </div>
          
           {/* Qualitative Feedback */}
           <div className={`rounded-xl shadow-lg p-6 text-white transition-colors duration-300 ${isEditing ? 'bg-indigo-800' : 'bg-indigo-900'}`}>
             <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-indigo-300" />
                Professor's AI-Assisted Feedback
             </h3>
             {isEditing ? (
                <textarea 
                   value={displayData.feedback}
                   onChange={(e) => updateFeedback(e.target.value)}
                   className="w-full h-32 bg-indigo-900/50 text-indigo-50 border border-indigo-500/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
             ) : (
                <p className="text-indigo-100 leading-relaxed italic">
                  "{displayData.feedback}"
                </p>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

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
         <input 
            type="number" 
            min="0" max="100"
            value={value} 
            onChange={(e) => onChange && onChange(parseInt(e.target.value))}
            className="w-14 text-right font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded px-1"
         />
      ) : (
        <span className="font-bold text-slate-900">{value}%</span>
      )}
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);