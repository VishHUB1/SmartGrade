export enum AppStage {
  INSTRUCTOR_SETUP = 'INSTRUCTOR_SETUP',
  STUDENT_SUBMISSION = 'STUDENT_SUBMISSION',
  DASHBOARD = 'DASHBOARD'
}

export interface AssignmentConfig {
  title: string;
  description: string;
  learningOutcomes: string[];
  classContext: string; // "Beginner", "Advanced", etc.
  additionalCriteria: string; // Captured text from files, rubrics, or voice transcripts
  assignmentFile?: {
    name: string;
    data: string; // Base64 encoded string
    mimeType: string;
  };
}

export interface StudentSubmission {
  studentName: string;
  repoUrl: string;
  reportText: string;
  reportFile?: {
    name: string;
    data: string; // Base64 encoded string
    mimeType: string;
  };
  promptLog: string;
  promptLogFile?: {
    name: string;
    data: string; // Base64 encoded string
    mimeType: string;
  };
}

export interface AnalysisResult {
  studentName: string;
  scores: {
    product: number;
    process: number;
    aiEfficiency: number;
    overall: number;
  };
  rubricBreakdown: {
    criteria: string;
    score: number;
    max: number;
    comment: string;
  }[];
  aiInsights: {
    summary: string;
    efficiencyBand: string; // "Strategic Collaborator", etc.
    promptQuality: string;
  };
  codebaseVerification: {
    githubStructure: string; // Comment on folder structure/organization
    scriptQuality: string; // Feedback on code style, comments, complexity
    readmeCredibility: string; // Does the README look real or AI-generated?
    overallCredibility: string; // "High", "Medium", "Low"
  };
  reportAnalysis: {
    structureQuality: string; // Analysis of report flow and professionalism
    visualEvidence: string; // Analysis of screenshots, diagrams, output images found in PDF
    criteriaMet: string[]; // Specific requirements clearly addressed
    criteriaMissed: string[]; // Specific requirements missing or vague
    keyInferences: string; // Deep inferences about student understanding
    additionalEffort: string; // Extra features or work beyond the brief
  };
  feedback: string;
}

export const MOCK_ANALYSIS_DATA: AnalysisResult[] = [
  {
    studentName: "Sarah Jenkins",
    scores: { product: 88, process: 92, aiEfficiency: 85, overall: 89 },
    rubricBreakdown: [
      { criteria: "Code Quality", score: 9, max: 10, comment: "Excellent modularity." },
      { criteria: "Testing", score: 8, max: 10, comment: "Good coverage, missed edge cases." }
    ],
    aiInsights: {
      summary: "Used AI to generate boilerplate, then manually refined logic.",
      efficiencyBand: "Strategic Collaborator",
      promptQuality: "High"
    },
    codebaseVerification: {
      githubStructure: "Standard React project structure. Separation of concerns is visible in the /components folder.",
      scriptQuality: "Scripts are well-commented. Variable naming is consistent.",
      readmeCredibility: "README includes setup instructions and screenshots, indicating manual effort.",
      overallCredibility: "High"
    },
    reportAnalysis: {
      structureQuality: "Professional academic structure with clear Abstract, Methodology, and Conclusion sections.",
      visualEvidence: "Includes clear architecture diagrams and screenshots of the responsive mobile view. The database schema diagram correctly models the many-to-many relationship.",
      criteriaMet: ["Implemented Redux", "Responsive Design", "Unit Tests included"],
      criteriaMissed: ["Did not include load testing results"],
      keyInferences: "Student demonstrates deep understanding of state management nuances, likely not just copying AI output.",
      additionalEffort: "Implemented a dark mode toggle which was not required."
    },
    feedback: "Great work showing ownership of the code."
  },
  {
    studentName: "Marcus Ray",
    scores: { product: 95, process: 60, aiEfficiency: 45, overall: 72 },
    rubricBreakdown: [
      { criteria: "Code Quality", score: 10, max: 10, comment: "Flawless code." },
      { criteria: "Testing", score: 5, max: 10, comment: "Tests appear auto-generated without verification." }
    ],
    aiInsights: {
      summary: "Heavy reliance on AI for entire blocks. Commit history is sparse.",
      efficiencyBand: "Over-reliant",
      promptQuality: "Low"
    },
    codebaseVerification: {
      githubStructure: "Flat file structure. All components in one folder.",
      scriptQuality: "Code is syntactically perfect but lacks specific domain comments.",
      readmeCredibility: "Generic AI-generated README template.",
      overallCredibility: "Low"
    },
    reportAnalysis: {
      structureQuality: "Report is brief and lacks a proper introduction. Reads more like a changelog than a reflection.",
      visualEvidence: "Screenshots are present but low resolution. No architecture diagrams provided.",
      criteriaMet: ["Functional Application", "Clean Code"],
      criteriaMissed: ["Reflection on challenges", "Detailed setup instructions"],
      keyInferences: "Understanding seems superficial; code works perfectly but report fails to explain 'why' decisions were made.",
      additionalEffort: "None detected."
    },
    feedback: "The product is great, but I need to see more of your own reasoning."
  }
];