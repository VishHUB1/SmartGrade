import React, { useState, useEffect, useRef } from 'react';
import { AssignmentConfig } from '../types';
import { generateLearningOutcomes } from '../services/geminiService';
import { Sparkles, Save, Book, Sliders, Mic, Paperclip, FileText, Trash2, Plus, X, StopCircle, UserCog, Loader2 } from 'lucide-react';

interface Props {
  config: AssignmentConfig;
  onChange: (config: AssignmentConfig) => void;
  onSave: (config: AssignmentConfig) => void;
}

export const InstructorSetup: React.FC<Props> = ({ config, onChange, onSave }) => {
  // REMOVED localConfig state. We now rely entirely on props to persist data across unmounts.
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscriptChunk = '';
          let interimTranscriptChunk = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscriptChunk += result[0].transcript;
            } else {
              interimTranscriptChunk += result[0].transcript;
            }
          }

          // Update main text with finalized chunks via PROP
          if (finalTranscriptChunk) {
             const separator = config.additionalCriteria && !config.additionalCriteria.endsWith(' ') ? ' ' : '';
             onChange({
                 ...config,
                 additionalCriteria: config.additionalCriteria + separator + finalTranscriptChunk
             });
          }

          // Update interim display
          setInterimTranscript(interimTranscriptChunk);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'not-allowed') {
             alert("Microphone access denied. Please allow microphone access.");
          }
          setIsRecording(false);
          setInterimTranscript('');
        };

        recognition.onend = () => {
           if (isRecording) {
             setIsRecording(false);
             setInterimTranscript('');
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
  }, [config, onChange, isRecording]); // Added dependencies to ensure closure captures latest props if needed

  const toggleRecording = () => {
    if (!recognitionRef.current) {
        alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
        return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript('');
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recording", e);
        setIsRecording(false);
      }
    }
  };

  const handleGenerateOutcomes = async () => {
    if (!config.description && !config.assignmentFile) return;
    setIsGenerating(true);
    const outcomes = await generateLearningOutcomes(config.description, config.assignmentFile);
    onChange({ ...config, learningOutcomes: outcomes });
    setIsGenerating(false);
  };

  const handleChange = (field: keyof AssignmentConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleFileUpload = (targetField: 'description' | 'additionalCriteria') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a PDF or Image (Binary) that we want to treat as an attachment
    const isBinary = file.type === 'application/pdf' || file.type.startsWith('image/');

    if (isBinary && targetField === 'description') {
       // For Assignment Brief, we store the PDF to send to Gemini
       const reader = new FileReader();
       reader.onload = (event) => {
         const base64 = event.target?.result as string;
         onChange({
           ...config,
           assignmentFile: {
             name: file.name,
             data: base64,
             mimeType: file.type
           }
         });
       };
       reader.readAsDataURL(file);
    } else {
       // For text files, or if we just want to append text
       const reader = new FileReader();
       reader.onload = (event) => {
         const text = event.target?.result as string;
         const currentText = config[targetField];
         const newText = currentText 
           ? `${currentText}\n\n[Attached File Content: ${file.name}]\n${text}`
           : text;
         handleChange(targetField, newText);
       };
       reader.readAsText(file);
    }
  };

  const clearAssignmentFile = () => {
    onChange({ ...config, assignmentFile: undefined });
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...config.learningOutcomes];
    newOutcomes[index] = value;
    onChange({ ...config, learningOutcomes: newOutcomes });
  };

  const deleteOutcome = (index: number) => {
    const newOutcomes = config.learningOutcomes.filter((_, i) => i !== index);
    onChange({ ...config, learningOutcomes: newOutcomes });
  };

  const addOutcome = () => {
    onChange({ ...config, learningOutcomes: [...config.learningOutcomes, "New Learning Outcome"] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Book className="w-5 h-5 mr-2 text-indigo-600" />
          Assignment Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Assignment Title</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="e.g. Full-Stack Task Manager with React"
              value={config.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Assignment Brief / Description</label>
            <div className="relative">
              <textarea 
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition h-32 resize-none"
                placeholder="Paste the assignment description here, or attach a PDF..."
                value={config.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
              <div className="absolute bottom-3 right-3 flex items-center space-x-2 bg-white/80 backdrop-blur-sm p-1 rounded-lg border border-slate-100 shadow-sm">
                <label className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1" title="Attach Assignment File (PDF/Text/MD)">
                  <Paperclip size={18} />
                  <input type="file" className="hidden" accept=".txt,.md,.json,.pdf,.doc,.docx" onChange={handleFileUpload('description')} />
                </label>
              </div>
            </div>
            
            {config.assignmentFile && (
              <div className="mt-2 flex items-center bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm border border-indigo-100 w-fit">
                <FileText size={16} className="mr-2" />
                <span className="font-medium mr-2">Attached: {config.assignmentFile.name}</span>
                <button onClick={clearAssignmentFile} className="text-indigo-400 hover:text-indigo-800 transition">
                  <X size={14} />
                </button>
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-1">The AI will use this (and any attached PDF) to generate criteria and learning outcomes.</p>
          </div>

          <div className="col-span-2">
             <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Learning Outcomes</label>
                <button 
                  onClick={handleGenerateOutcomes}
                  disabled={isGenerating || (!config.description && !config.assignmentFile)}
                  className="flex items-center text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 disabled:opacity-50 transition"
                >
                  <Sparkles size={14} className="mr-1" />
                  {isGenerating ? "Analyzing..." : "Auto-Generate with Gemini"}
                </button>
             </div>
             
             <div className="space-y-2">
               {config.learningOutcomes.map((outcome, idx) => (
                 <div key={idx} className="flex items-center gap-2 group">
                   <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{idx + 1}</span>
                   <input 
                      type="text"
                      value={outcome}
                      onChange={(e) => updateOutcome(idx, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-white text-slate-900 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                   />
                   <button 
                    onClick={() => deleteOutcome(idx)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
               
               <button 
                  onClick={addOutcome}
                  className="flex items-center text-sm text-indigo-600 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition mt-2"
               >
                 <Plus size={16} className="mr-1" />
                 Add Outcome
               </button>

               {config.learningOutcomes.length === 0 && (
                 <div className="text-sm text-slate-400 italic px-3 py-2 bg-slate-50 rounded border border-dashed border-slate-200">
                   No outcomes yet. Generate them from description or add manually.
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <UserCog className="w-5 h-5 mr-2 text-indigo-600" />
          Professor's Grading Persona & Mindset
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
           <div className="col-span-1">
             <label className="block text-sm font-medium text-slate-700 mb-2">Class Context</label>
             <select 
               className="w-full md:w-1/3 px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
               value={config.classContext}
               onChange={(e) => handleChange('classContext', e.target.value)}
             >
               <option value="Beginner">Beginner (1st Year)</option>
               <option value="Intermediate">Intermediate (2nd-3rd Year)</option>
               <option value="Advanced">Advanced / Masters</option>
             </select>
           </div>

           <div className="border-t border-slate-100 pt-6">
             <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
               Correction Style & Personalization
             </h3>
             <p className="text-xs text-slate-500 mb-4">
               How do you want the agent to grade? Speak your mind! <br/>
               <i>"I want to be strict on logic but lenient on CSS. If they use AI, they must explain WHY. Focus heavily on the Conclusion section."</i>
             </p>
             
             <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <textarea 
                        className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-40 text-sm"
                        placeholder="Type your grading philosophy here, or use the voice button to dictate instructions..."
                        value={config.additionalCriteria || ''}
                        onChange={(e) => handleChange('additionalCriteria', e.target.value)}
                    />
                     <div className="absolute bottom-3 right-3 flex items-center space-x-2 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-sm">
                        <label className="flex items-center space-x-1 text-slate-500 hover:text-indigo-600 transition cursor-pointer px-2 py-1 rounded hover:bg-slate-50" title="Attach Rubric (Text/MD/PDF)">
                            <Paperclip size={16} />
                            <span className="text-xs font-medium">Attach Rubric</span>
                            <input type="file" className="hidden" accept=".txt,.md,.json,.csv,.pdf,.doc,.docx" onChange={handleFileUpload('additionalCriteria')} />
                        </label>
                    </div>
                </div>

                <div className="w-full md:w-48 flex flex-col space-y-2">
                    <button 
                        onClick={toggleRecording}
                        className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all shadow-sm
                            ${isRecording 
                                ? 'border-red-500 bg-red-50 text-red-600 animate-pulse' 
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                            }
                        `}
                    >
                        {isRecording ? <StopCircle size={32} className="mb-2" /> : <Mic size={32} className="mb-2" />}
                        <span className="font-semibold text-sm">{isRecording ? "Stop Dictation" : "Dictate Grading Style"}</span>
                        <span className="text-[10px] opacity-70 mt-1">{isRecording ? "Listening..." : "Click to speak"}</span>
                    </button>
                    {isRecording && (
                        <div className="text-center text-xs text-slate-500 bg-slate-100 p-2 rounded animate-pulse">
                            {interimTranscript ? `"...${interimTranscript}"` : "Listening..."}
                        </div>
                    )}
                </div>
             </div>
           </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => onSave(config)}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
        >
          <Save size={20} className="mr-2" />
          Save Configuration
        </button>
      </div>
    </div>
  );
};