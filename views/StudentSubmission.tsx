import React, { useState } from 'react';
import { StudentSubmission } from '../types';
import { Send, Github, FileText, MessageSquare, Paperclip, X, File, Database, Download, AlertCircle, Check, RefreshCw, Server, Search, ExternalLink, CloudDownload } from 'lucide-react';

interface Props {
  data: StudentSubmission;
  onChange: (data: StudentSubmission) => void;
  onSubmit: (submission: StudentSubmission) => void;
}

export const StudentSubmissionView: React.FC<Props> = ({ data, onChange, onSubmit }) => {
  // Use 'data' from props instead of local 'submission' state
  // We will trigger onChange directly

  // Server Import State
  const [showServerImport, setShowServerImport] = useState(false);
  const [serverUrl, setServerUrl] = useState('https://script.google.com/macros/s/AKfycbzMqOUMv6xKAgwDVlQq2mq9PZyvnXjm-eVV774JQyPGnkF2G-CTPe8V5nUcRPOyp8mb/exec');
  const [rollNo, setRollNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<{success: boolean, message: string} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.studentName || (!data.reportText && !data.reportFile && !data.reportLink)) {
      alert("Please provide a Name and a Report (text, file, or link).");
      return;
    }

    // Ensure repo URL has protocol
    let finalRepoUrl = data.repoUrl;
    if (finalRepoUrl && !finalRepoUrl.startsWith('http')) {
      finalRepoUrl = `https://${finalRepoUrl}`;
    }

    onSubmit({
      ...data,
      repoUrl: finalRepoUrl
    });
  };

  const fillMockData = () => {
    onChange({
      ...data,
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
AI: [Corrections...]`
    });
  };

  // --- Helpers ---
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const fetchDriveFile = async (url: string): Promise<{data: string, name: string, mimeType: string} | null> => {
    try {
        // Extract ID
        const idMatch = url.match(/(?:id=|\/d\/)([\w-]+)/);
        if (!idMatch) return null;
        
        const fileId = idMatch[1];
        // Construct download URL
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        // Attempt fetch
        const response = await fetch(downloadUrl);
        if (!response.ok) return null;
        
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // Determine mimeType (fallback to PDF if unknown/octet-stream)
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
            mimeType = 'application/pdf'; 
        }

        return {
            name: `Imported Report (${fileId.substring(0,6)}).pdf`,
            data: base64,
            mimeType: mimeType
        };
    } catch (e) {
        console.warn("Direct Drive fetch failed (CORS likely). Falling back to link.", e);
        return null;
    }
  };

  // --- Apps Script Logic ---

  const fetchAppsScriptData = async () => {
    if (!serverUrl || !rollNo) {
      alert("Please provide both Server URL and Roll No.");
      return;
    }

    setIsLoading(true);
    setFetchStatus(null);
    
    try {
      // Append rollno as query param
      const url = new URL(serverUrl);
      url.searchParams.append('rollno', rollNo);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const result = await response.json();

      if (result.success === false) {
        setFetchStatus({ success: false, message: result.message || "No submission found." });
      } else if (result.success && result.data) {
        const resultData = result.data;
        const newSubmission = { ...data };
        
        newSubmission.studentName = resultData.studentName || "";
        newSubmission.repoUrl = resultData.githubLink || "";
        newSubmission.reportText = "";
        newSubmission.reportFile = undefined;
        newSubmission.reportLink = undefined;
        newSubmission.promptLog = "";
        newSubmission.promptLogFile = undefined;
        newSubmission.promptLogLink = undefined;

        // --- Handle Report ---
        if (resultData.reportMethod === "Upload PDF/Document" && resultData.reportLink) {
            // STRICTLY Try to fetch the file content first
            const fileData = await fetchDriveFile(resultData.reportLink);
            
            if (fileData) {
                // Success: Attach as file
                newSubmission.reportFile = fileData;
            } else {
                // Fallback: Store link for specialized UI
                newSubmission.reportLink = resultData.reportLink;
            }
        } else {
            // Text Mode
            newSubmission.reportText = resultData.reportText || "";
        }

        // --- Handle AI Prompts ---
        if (resultData.aiMethod === "Upload PDF/Document" && resultData.aiLink) {
            const fileData = await fetchDriveFile(resultData.aiLink);
            if (fileData) {
                newSubmission.promptLogFile = fileData;
            } else {
                newSubmission.promptLogLink = resultData.aiLink;
            }
        } else {
            newSubmission.promptLog = resultData.aiText || "";
        }

        onChange(newSubmission);
        setFetchStatus({ success: true, message: `Loaded submission for ${resultData.studentName}` });
      }

    } catch (error) {
      console.error(error);
      setFetchStatus({ success: false, message: "Error connecting to server." });
    } finally {
      setIsLoading(false);
    }
  };

  // --- File Handlers ---

  const handleFileUpload = (textAreaField: 'reportText' | 'promptLog', fileField: 'reportFile' | 'promptLogFile') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Remove any previous link if we are uploading manually
    const newData = { ...data };
    if (textAreaField === 'reportText') newData.reportLink = undefined;
    if (textAreaField === 'promptLog') newData.promptLogLink = undefined;

    const isBinary = file.type === 'application/pdf' || file.type.startsWith('image/');
    const reader = new FileReader();

    if (isBinary) {
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        newData[fileField] = { name: file.name, data: base64, mimeType: file.type };
        onChange(newData);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const currentText = newData[textAreaField] as string;
        newData[textAreaField] = currentText ? `${currentText}\n\n[Attached File: ${file.name}]\n${text}` : text;
        onChange(newData);
      };
      reader.readAsText(file);
    }
  };

  const removeFile = (field: 'reportFile' | 'promptLogFile') => {
    const newData = { ...data };
    delete newData[field];
    onChange(newData);
  };

  const removeLink = (field: 'reportLink' | 'promptLogLink') => {
    const newData = { ...data };
    delete newData[field];
    onChange(newData);
  };

  const handleChange = (field: keyof StudentSubmission, value: any) => {
      onChange({ ...data, [field]: value });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Apps Script Import Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button 
          onClick={() => setShowServerImport(!showServerImport)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition text-slate-700 font-medium"
        >
          <div className="flex items-center">
            <Server className="mr-2 text-indigo-600" size={20} />
            Import from Student Submission
          </div>
          <div className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
             {showServerImport ? "Close" : "Fetch"}
          </div>
        </button>

        {showServerImport && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Apps Script Web App URL</label>
                  <input 
                    type="url" 
                    value={serverUrl} 
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://script.google.com/..."
                    className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Roll Number</label>
                   <input 
                    type="number" 
                    value={rollNo} 
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
             </div>
             
             <div className="flex items-center justify-between">
                <button 
                  onClick={fetchAppsScriptData}
                  disabled={isLoading}
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="animate-spin mr-2" size={16}/> : <Search className="mr-2" size={16}/>}
                  Fetch Submission
                </button>

                {fetchStatus && (
                   <div className={`flex items-center text-sm ${fetchStatus.success ? 'text-green-600' : 'text-red-500'}`}>
                      {fetchStatus.success ? <Check size={16} className="mr-1"/> : <AlertCircle size={16} className="mr-1"/>}
                      {fetchStatus.message}
                   </div>
                )}
             </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white font-semibold text-lg flex items-center">
            <Send className="mr-2" size={20} />
            Submit Assignment
          </h2>
          <button onClick={fillMockData} className="text-indigo-200 text-xs hover:text-white underline decoration-dashed">
            Auto-fill Mock Data
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Full Name"
              value={data.studentName}
              onChange={(e) => handleChange('studentName', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <Github size={16} className="mr-2" />
              GitHub Repository URL
            </label>
            <input 
              type="url" 
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://github.com/username/project"
              value={data.repoUrl}
              onChange={(e) => handleChange('repoUrl', e.target.value)}
            />
          </div>

          {/* REPORT SECTION */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <FileText size={16} className="mr-2" />
              Project Report & Reflection
            </label>
            
            {!data.reportFile && !data.reportLink && (
              <div className="relative">
                <textarea 
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-40"
                  placeholder="Describe your process, challenges, and design choices... or attach a PDF."
                  value={data.reportText}
                  onChange={(e) => handleChange('reportText', e.target.value)}
                />
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm p-1 rounded-lg border border-slate-100 shadow-sm">
                  <label className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1 flex items-center" title="Attach Report">
                    <Paperclip size={18} />
                    <input type="file" className="hidden" accept=".pdf,.txt,.md,.doc,.docx" onChange={handleFileUpload('reportText', 'reportFile')} />
                  </label>
                </div>
              </div>
            )}

            {/* Imported/Uploaded File Card */}
            {data.reportFile && (
              <div className="mt-2 flex items-center justify-between bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg border border-indigo-100">
                <div className="flex items-center">
                   <div className="p-2 bg-white rounded-lg border border-indigo-100 mr-3">
                      <CloudDownload size={20} className="text-indigo-500" />
                   </div>
                   <div>
                       <div className="font-semibold text-sm">{data.reportFile.name}</div>
                       <div className="text-xs text-indigo-400">Ready for Analysis • {Math.round(data.reportFile.data.length / 1024)} KB</div>
                   </div>
                </div>
                <button type="button" onClick={() => removeFile('reportFile')} className="text-indigo-400 hover:text-red-500 transition p-2">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* External Link Card Fallback */}
            {data.reportLink && !data.reportFile && (
               <div className="mt-2 flex items-center justify-between bg-amber-50 text-amber-800 px-4 py-3 rounded-lg border border-amber-100">
                   <div className="flex items-center">
                      <div className="p-2 bg-white rounded-lg border border-amber-100 mr-3">
                         <ExternalLink size={20} className="text-amber-500" />
                      </div>
                      <div>
                          <div className="font-semibold text-sm">External Document Linked</div>
                          <a href={data.reportLink} target="_blank" rel="noreferrer" className="text-xs text-amber-600 underline truncate max-w-[200px] block hover:text-amber-800">
                             {data.reportLink}
                          </a>
                      </div>
                   </div>
                   <button type="button" onClick={() => removeLink('reportLink')} className="text-amber-400 hover:text-red-500 transition p-2">
                     <X size={18} />
                   </button>
               </div>
            )}
          </div>

          {/* AI PROMPT SECTION */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <MessageSquare size={16} className="mr-2" />
              AI Prompt Logs
            </label>

            {!data.promptLogFile && !data.promptLogLink && (
              <div className="relative">
                <textarea 
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 font-mono text-sm"
                  placeholder="Paste logs here..."
                  value={data.promptLog}
                  onChange={(e) => handleChange('promptLog', e.target.value)}
                />
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm p-1 rounded-lg border border-slate-100 shadow-sm">
                   <label className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1 flex items-center">
                    <Paperclip size={18} />
                    <input type="file" className="hidden" accept=".pdf,.txt,.json,.log" onChange={handleFileUpload('promptLog', 'promptLogFile')} />
                  </label>
                </div>
              </div>
            )}

            {data.promptLogFile && (
              <div className="mt-2 flex items-center justify-between bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg border border-indigo-100">
                <div className="flex items-center">
                   <div className="p-2 bg-white rounded-lg border border-indigo-100 mr-3">
                      <CloudDownload size={20} className="text-indigo-500" />
                   </div>
                   <span className="font-medium text-sm">{data.promptLogFile.name}</span>
                </div>
                <button type="button" onClick={() => removeFile('promptLogFile')} className="text-indigo-400 hover:text-red-500 transition">
                  <X size={18} />
                </button>
              </div>
            )}

            {data.promptLogLink && !data.promptLogFile && (
               <div className="mt-2 flex items-center justify-between bg-amber-50 text-amber-800 px-4 py-3 rounded-lg border border-amber-100">
                   <div className="flex items-center">
                      <div className="p-2 bg-white rounded-lg border border-amber-100 mr-3">
                         <ExternalLink size={20} className="text-amber-500" />
                      </div>
                      <div className="font-semibold text-sm">External Logs Linked</div>
                   </div>
                   <button type="button" onClick={() => removeLink('promptLogLink')} className="text-amber-400 hover:text-red-500 transition">
                     <X size={18} />
                   </button>
               </div>
            )}
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