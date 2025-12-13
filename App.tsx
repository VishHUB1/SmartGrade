import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './views/LandingPage';
import { InstructorSetup } from './views/InstructorSetup';
import { StudentSubmissionView } from './views/StudentSubmission';
import { Dashboard } from './views/Dashboard';
import { GradingAssistant } from './views/GradingAssistant';
import { AppStage, AssignmentConfig, StudentSubmission, AnalysisResult, UserProfile } from './types';
import { analyzeSubmission } from './services/geminiService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.LANDING);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  // --- PERSISTENT STATE ---
  
  // Instructor Config State
  const [assignmentConfig, setAssignmentConfig] = useState<AssignmentConfig>({
    title: '',
    description: '',
    learningOutcomes: [],
    classContext: 'Intermediate',
    additionalCriteria: ''
  });

  // Analysis History State
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);

  // Student Submission Draft State (Lifted Up)
  const [studentDraft, setStudentDraft] = useState<StudentSubmission>({
    studentName: '',
    repoUrl: '',
    reportText: '',
    promptLog: ''
  });

  // --- AUTH & PERSISTENCE ---

  const handleLogin = (name: string, email: string) => {
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const newUser = { name, email, avatarInitials: initials };
      setUser(newUser);
      
      // Load Data
      const storageKey = `integrity_lens_data_${email}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
          try {
              const parsed = JSON.parse(savedData);
              if (parsed.config) setAssignmentConfig(parsed.config);
              if (parsed.history) setAnalysisHistory(parsed.history);
          } catch(e) { console.error("Failed to load saved data", e); }
      } else {
          // Reset if no data found for this user
          setAssignmentConfig({
            title: '',
            description: '',
            learningOutcomes: [],
            classContext: 'Intermediate',
            additionalCriteria: ''
          });
          setAnalysisHistory([]);
      }

      setStage(AppStage.INSTRUCTOR_SETUP);
  };

  // Save Data Effect
  useEffect(() => {
     if (user && user.email) {
         const storageKey = `integrity_lens_data_${user.email}`;
         const dataToSave = {
             config: assignmentConfig,
             history: analysisHistory
         };
         localStorage.setItem(storageKey, JSON.stringify(dataToSave));
     }
  }, [user, assignmentConfig, analysisHistory]);

  // --- HANDLERS ---

  const handleConfigSave = (config: AssignmentConfig) => {
    setAssignmentConfig(config);
    setStage(AppStage.STUDENT_SUBMISSION);
  };

  const handleStudentSubmit = async (submission: StudentSubmission) => {
    setLoading(true);
    // Update the draft one last time to ensure it's in sync
    setStudentDraft(submission);
    
    try {
      // Call Gemini Service
      const result = await analyzeSubmission(assignmentConfig, submission);
      
      // Add new result to the history (newest first)
      setAnalysisHistory(prev => [result, ...prev]);
      
      // Clear draft for next student? Optional. Let's keep it for now in case they want to edit and resubmit.
      // setStudentDraft({ ... }); 
      
      setStage(AppStage.DASHBOARD);
    } catch (e) {
      alert("Analysis failed. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (stage === AppStage.LANDING) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <Layout currentStage={stage} setStage={setStage} user={user}>
      {loading ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-600">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <h2 className="text-xl font-semibold">Analyzing Submission...</h2>
          <p className="text-sm text-slate-500 mt-2">Evaluating against rubric, process logs, and your specific grading persona.</p>
        </div>
      ) : (
        <>
          {stage === AppStage.INSTRUCTOR_SETUP && (
            <InstructorSetup 
              config={assignmentConfig} 
              onChange={setAssignmentConfig} 
              onSave={handleConfigSave} 
            />
          )}
          {stage === AppStage.STUDENT_SUBMISSION && (
            <StudentSubmissionView 
              data={studentDraft} 
              onChange={setStudentDraft}
              onSubmit={handleStudentSubmit} 
            />
          )}
          {stage === AppStage.DASHBOARD && (
            <Dashboard analysisHistory={analysisHistory} assignmentConfig={assignmentConfig} />
          )}
          {stage === AppStage.GRADING_ASSISTANT && (
            <GradingAssistant analysisHistory={analysisHistory} assignmentConfig={assignmentConfig} />
          )}
        </>
      )}
    </Layout>
  );
};

export default App;