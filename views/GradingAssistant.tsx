import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, AssignmentConfig, MOCK_ANALYSIS_DATA } from '../types';
import { Bot, User as UserIcon, Loader2, Send, Mic, StopCircle, Sparkles, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithGlobalAssistant } from '../services/geminiService';

interface Props {
  analysisHistory: AnalysisResult[];
  assignmentConfig: AssignmentConfig;
}

export const GradingAssistant: React.FC<Props> = ({ analysisHistory, assignmentConfig }) => {
  const allData = [...analysisHistory, ...MOCK_ANALYSIS_DATA];
  
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'agent', text: string}[]>([
      { role: 'agent', text: `Hello Professor. I am your Grading Assistant. I have analyzed **${allData.length} submissions** for _"${assignmentConfig.title || 'the assignment'}"_. \n\nYou can ask me about:\n- Individual students\n- Class trends\n- How to navigate this dashboard` }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_PROMPTS = [
    "Who is the top performer?",
    "Identify students at risk",
    "Summarize grading trends",
    "Show me the class average"
  ];

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

  const handleSendMessage = async (textOverride?: string) => {
      const messageText = textOverride || chatInput;
      if (!messageText.trim()) return;

      const userMsg = messageText;
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
  }, [chatMessages, interimTranscript]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-[calc(100vh-7rem)] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white flex-shrink-0">
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

                {/* Suggested Prompts - Only show if just the welcome message exists */}
                {chatMessages.length === 1 && !isChatLoading && (
                  <div className="flex flex-col items-center justify-center space-y-4 mt-8">
                     <div className="flex items-center text-slate-400 text-sm font-medium">
                        <Sparkles size={14} className="mr-2" />
                        Suggested Prompts
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                        {SUGGESTED_PROMPTS.map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(prompt)}
                            className="text-left px-4 py-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-slate-700 hover:text-indigo-700 text-sm transition-all shadow-sm hover:shadow group flex items-center justify-between"
                          >
                            <span>{prompt}</span>
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                          </button>
                        ))}
                     </div>
                  </div>
                )}
                
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

            <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
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
                            placeholder={isRecording ? "Listening..." : "Type your question here..."}
                            className={`w-full pl-5 pr-12 py-4 border rounded-full focus:ring-2 focus:ring-indigo-500 outline-none text-base shadow-sm transition-all
                                ${isRecording 
                                    ? 'border-red-400 bg-red-50 text-red-700 placeholder:text-red-400' 
                                    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'}
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
                        onClick={() => handleSendMessage()}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition transform active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
  );
};