import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { InstructorSetup } from './views/InstructorSetup';
import { StudentSubmissionView } from './views/StudentSubmission';
import { Dashboard } from './views/Dashboard';
import { AppStage, AssignmentConfig, StudentSubmission, AnalysisResult } from './types';
import { analyzeSubmission } from './services/geminiService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.INSTRUCTOR_SETUP);
  const [loading, setLoading] = useState(false);

  // App State
  const [assignmentConfig, setAssignmentConfig] = useState<AssignmentConfig>({
    title: '',
    description: '',
    learningOutcomes: [],
    classContext: 'Intermediate',
    additionalCriteria: ''
  });

  // Store history of all analyzed students
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);

  const handleConfigSave = (config: AssignmentConfig) => {
    setAssignmentConfig(config);
    setStage(AppStage.STUDENT_SUBMISSION);
  };

  const handleStudentSubmit = async (submission: StudentSubmission) => {
    setLoading(true);
    try {
      // Call Gemini Service
      const result = await analyzeSubmission(assignmentConfig, submission);
      
      // Add new result to the history (newest first)
      setAnalysisHistory(prev => [result, ...prev]);
      
      setStage(AppStage.DASHBOARD);
    } catch (e) {
      alert("Analysis failed. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout currentStage={stage} setStage={setStage}>
      {loading ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-600">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <h2 className="text-xl font-semibold">Analyzing Submission...</h2>
          <p className="text-sm text-slate-500 mt-2">Evaluating against rubric, process logs, and your specific grading persona.</p>
        </div>
      ) : (
        <>
          {stage === AppStage.INSTRUCTOR_SETUP && (
            <InstructorSetup config={assignmentConfig} onSave={handleConfigSave} />
          )}
          {stage === AppStage.STUDENT_SUBMISSION && (
            <StudentSubmissionView onSubmit={handleStudentSubmit} />
          )}
          {stage === AppStage.DASHBOARD && (
            <Dashboard analysisHistory={analysisHistory} />
          )}
        </>
      )}
    </Layout>
  );
};

export default App;