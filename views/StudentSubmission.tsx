import React, { useState } from 'react';
import { StudentSubmission } from '../types';
import { Send, Github, FileText, MessageSquare, Paperclip, X, File } from 'lucide-react';

interface Props {
  onSubmit: (submission: StudentSubmission) => void;
}

export const StudentSubmissionView: React.FC<Props> = ({ onSubmit }) => {
  const [submission, setSubmission] = useState<StudentSubmission>({
    studentName: '',
    repoUrl: '',
    reportText: '',
    promptLog: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission.studentName || (!submission.reportText && !submission.reportFile)) {
      alert("Please provide a Name and a Report (text or file).");
      return;
    }

    // Ensure repo URL has protocol
    let finalRepoUrl = submission.repoUrl;
    if (finalRepoUrl && !finalRepoUrl.startsWith('http')) {
      finalRepoUrl = `https://${finalRepoUrl}`;
    }

    onSubmit({
      ...submission,
      repoUrl: finalRepoUrl
    });
  };

  const fillMockData = () => {
    setSubmission({
      studentName: "Alex Chen",
      repoUrl: "https://github.com/alexchen/react-todo-advanced",
      reportText: `I chose to use Redux for state management to demonstrate scalability, even though Context API might have sufficed for this size. 
      
Major Challenges:
1. Handling the asynchronous updates for local storage.
2. Designing a clean component hierarchy.

I used AI primarily to help generate the initial boilerplate for the Redux slices and to debug a tricky race condition in the useEffect hook. I rewrote most of the UI logic myself to ensure accessibility standards were met.`,
      promptLog: `User: Create a Redux slice for a Todo app with actions for add, remove, and toggle.
AI: [Generates code...]
User: The toggle action isn't updating the state immutably. Fix it.
AI: [Corrections...]
User: How do I test this reducer using Jest?
AI: [Test examples...]`
    });
  };

  const handleFileUpload = (textAreaField: 'reportText' | 'promptLog', fileField: 'reportFile' | 'promptLogFile') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine if it's a binary file (PDF/Image) or Text
    const isBinary = file.type === 'application/pdf' || file.type.startsWith('image/');

    if (isBinary) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSubmission(prev => ({
          ...prev,
          [fileField]: {
            name: file.name,
            data: base64,
            mimeType: file.type
          }
        }));
      };
      reader.readAsDataURL(file);
    } else {
      // Treat as text (md, txt, json, code files)
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const currentText = submission[textAreaField];
        const newText = currentText 
          ? `${currentText}\n\n[Attached File Content: ${file.name}]\n${text}`
          : text;
        setSubmission(prev => ({ ...prev, [textAreaField]: newText }));
      };
      reader.readAsText(file);
    }
  };

  const removeFile = (field: 'reportFile' | 'promptLogFile') => {
    setSubmission(prev => {
      const newState = { ...prev };
      delete newState[field];
      return newState;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white font-semibold text-lg flex items-center">
            <Send className="mr-2" size={20} />
            Submit Assignment
          </h2>
          <button 
            onClick={fillMockData}
            className="text-indigo-200 text-xs hover:text-white underline decoration-dashed"
          >
            Auto-fill Mock Data
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Full Name"
              value={submission.studentName}
              onChange={(e) => setSubmission({...submission, studentName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <Github size={16} className="mr-2" />
              GitHub Repository URL
            </label>
            <input 
              type="url" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://github.com/username/project"
              value={submission.repoUrl}
              onChange={(e) => setSubmission({...submission, repoUrl: e.target.value})}
            />
            <p className="text-xs text-slate-500 mt-1">
              Ensure the repository is Public. The system will use Google Search to verify the codebase structure.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <FileText size={16} className="mr-2" />
              Project Report & Reflection
            </label>
            <div className="relative">
              <textarea 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-40"
                placeholder="Describe your process, challenges, and design choices... or attach a PDF."
                value={submission.reportText}
                onChange={(e) => setSubmission({...submission, reportText: e.target.value})}
              />
              <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm p-1 rounded-lg border border-slate-100 shadow-sm">
                <label className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1 flex items-center" title="Attach Report (PDF/Text/MD)">
                  <Paperclip size={18} />
                  <input type="file" className="hidden" accept=".pdf,.txt,.md,.doc,.docx" onChange={handleFileUpload('reportText', 'reportFile')} />
                </label>
              </div>
            </div>
            {submission.reportFile && (
              <div className="mt-2 flex items-center justify-between bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm border border-indigo-100">
                <div className="flex items-center">
                   <File size={16} className="mr-2" />
                   <span className="font-medium">{submission.reportFile.name}</span>
                </div>
                <button type="button" onClick={() => removeFile('reportFile')} className="text-indigo-400 hover:text-indigo-800 transition">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <MessageSquare size={16} className="mr-2" />
              AI Prompt Logs (Optional but Recommended)
            </label>
            <div className="relative">
              <textarea 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 font-mono text-sm"
                placeholder="Paste your conversation logs with ChatGPT/Claude/Gemini here..."
                value={submission.promptLog}
                onChange={(e) => setSubmission({...submission, promptLog: e.target.value})}
              />
              <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm p-1 rounded-lg border border-slate-100 shadow-sm">
                 <label className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1 flex items-center" title="Attach Logs (PDF/Text/JSON)">
                  <Paperclip size={18} />
                  <input type="file" className="hidden" accept=".pdf,.txt,.json,.log" onChange={handleFileUpload('promptLog', 'promptLogFile')} />
                </label>
              </div>
            </div>
            {submission.promptLogFile && (
              <div className="mt-2 flex items-center justify-between bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm border border-indigo-100">
                <div className="flex items-center">
                   <File size={16} className="mr-2" />
                   <span className="font-medium">{submission.promptLogFile.name}</span>
                </div>
                <button type="button" onClick={() => removeFile('promptLogFile')} className="text-indigo-400 hover:text-indigo-800 transition">
                  <X size={16} />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">This helps us evaluate your AI-collaboration efficiency.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
             <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition transform hover:-translate-y-0.5"
             >
               Submit for Analysis
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};