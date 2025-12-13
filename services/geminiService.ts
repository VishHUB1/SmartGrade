import { GoogleGenAI, Type } from "@google/genai";
import { AssignmentConfig, StudentSubmission, AnalysisResult, PlagiarismGroup } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper: Fetch GitHub Content
const fetchGithubRepoContent = async (repoUrl: string): Promise<string> => {
  try {
    // 1. Extract Owner and Repo
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return "Invalid GitHub URL format.";
    const owner = match[1];
    const repo = match[2].replace('.git', '');

    // 2. Fetch Root Directory
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
       return `Unable to fetch GitHub API (Status ${response.status}). The repository might be private or deleted.`;
    }

    const files = await response.json();
    if (!Array.isArray(files)) return "GitHub API returned unexpected format.";

    let context = `GitHub Repository Content (${owner}/${repo}):\n\n`;

    // 3. Find README and up to 3 code files
    const readme = files.find((f: any) => f.name.toLowerCase().includes('readme'));
    // Filter for code files (ts, js, py, java, html, css, etc) and exclude images/binaries
    const codeFiles = files.filter((f: any) => 
       f.type === 'file' && 
       !f.name.toLowerCase().includes('readme') &&
       /\.(ts|tsx|js|jsx|py|java|c|cpp|html|css|json|md)$/i.test(f.name)
    ).slice(0, 3); // Limit to 3 files

    const filesToFetch = readme ? [readme, ...codeFiles] : codeFiles;

    // 4. Fetch content for these files
    for (const file of filesToFetch) {
      // Using raw_url or fetching via download_url
      if (file.download_url) {
        try {
          const contentRes = await fetch(file.download_url);
          const contentText = await contentRes.text();
          context += `--- START OF FILE: ${file.name} ---\n${contentText.substring(0, 5000)}\n--- END OF FILE ---\n\n`;
        } catch (e) {
          context += `[Error downloading file: ${file.name}]\n`;
        }
      }
    }

    if (files.length === 0) {
        context += "Repository appears empty.";
    } else {
        context += `\nDirectory Listing (Root):\n${files.map((f:any) => `- ${f.name} (${f.type})`).join('\n')}`;
    }

    return context;

  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return "Failed to access GitHub API to verify code.";
  }
};

export const generateLearningOutcomes = async (description: string, assignmentFile?: { data: string; mimeType: string }): Promise<string[]> => {
  const client = getClient();
  if (!client) return ["Understand core concepts", "Implement basic features", "Debug effectively"];

  try {
    const parts: any[] = [];
    
    // Add file content if available
    if (assignmentFile) {
      const base64Data = assignmentFile.data.includes(',') 
        ? assignmentFile.data.split(',')[1] 
        : assignmentFile.data;
      
      parts.push({
        inlineData: {
          mimeType: assignmentFile.mimeType,
          data: base64Data
        }
      });
    }

    // Add text prompt
    let promptText = `Given the assignment description`;
    if (assignmentFile) promptText += ` (and the attached document)`;
    promptText += `, generate a list of 3-5 short, specific learning outcomes.
      
      Assignment Text: "${description}"
      
      Return ONLY a JSON array of strings.`;

    parts.push({ text: promptText });

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Analysis Failed: Default Outcome 1", "Analysis Failed: Default Outcome 2"];
  }
};

export const checkPlagiarism = async (students: AnalysisResult[]): Promise<PlagiarismGroup[]> => {
  const client = getClient();
  if (!client || students.length < 2) return [];

  // We construct a prompt that feeds the AI the "DNA" of each student's submission
  // NOW INCLUDING: The actual 'textSnippet' extracted from the report.
  const studentDigests = students.map(s => ({
      name: s.studentName,
      textSnippet: s.textSnippet ? s.textSnippet.substring(0, 1000) : "No text textSnippet available.", // Limit for context window safety
      summary: s.aiInsights.summary,
      keyInferences: s.reportAnalysis.keyInferences,
      codeStructure: s.codebaseVerification.githubStructure
  }));

  const prompt = `
    You are an Academic Integrity Officer.
    I will provide you with the extracted text snippets and analysis summaries of ${students.length} student submissions.
    
    Your task is to identify pairs or groups of students who have suspiciously similar work.
    
    CRITICAL: You must look for COLLUSION (copying).
    
    Compare the 'textSnippet' fields closely. 
    1. If two students have nearly identical sentences or paragraph structures in their 'textSnippet', flag them.
    2. If their 'keyInferences' are strangely specific and identical, flag them.
    3. If their 'codeStructure' descriptions are identical in a way that suggests copied files, flag them.

    DATA:
    ${JSON.stringify(studentDigests, null, 2)}

    OUTPUT:
    Return a JSON array of objects. Each object represents a suspicious group.
    Format:
    [
      {
        "students": ["Name A", "Name B"],
        "reason": "Both students share identical sentences in their report introduction: '[quote sentence]'. Additionally, both failed to implement the exact same edge case.",
        "confidence": "High" | "Medium" | "Low"
      }
    ]
    
    If no plagiarism is detected, return an empty array [].
  `;

  try {
      const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          students: { type: Type.ARRAY, items: { type: Type.STRING } },
                          reason: { type: Type.STRING },
                          confidence: { type: Type.STRING }
                      }
                  }
              }
          }
      });
      
      const text = response.text;
      if (!text) return [];
      return JSON.parse(text);

  } catch (e) {
      console.error("Plagiarism Check Error", e);
      return [];
  }
};

export const analyzeSubmission = async (
  assignment: AssignmentConfig,
  submission: StudentSubmission
): Promise<AnalysisResult> => {
  const client = getClient();
  // Fallback to mock if no API key or error
  if (!client) {
    return {
      studentName: submission.studentName,
      confidenceScore: 0,
      textSnippet: "Mock text snippet.",
      scores: { product: 75, process: 70, aiEfficiency: 60, overall: 70 },
      rubricBreakdown: [
        { criteria: "System Simulation", score: 7, max: 10, comment: "Mock analysis generated (No API Key)." }
      ],
      aiInsights: {
        summary: "Unable to analyze prompt logs without API key.",
        efficiencyBand: "Unknown",
        promptQuality: "Unknown"
      },
      codebaseVerification: {
         githubStructure: "Mock: Unable to verify GitHub without API Key.",
         scriptQuality: "Mock: Unable to verify scripts.",
         readmeCredibility: "Mock: Unknown.",
         overallCredibility: "Medium",
         fileAnalyses: []
      },
      reportAnalysis: {
        structureQuality: "Mock Analysis.",
        visualEvidence: "Mock Analysis.",
        criteriaMet: ["Mock Criterion 1"],
        criteriaMissed: ["Mock Criterion 2"],
        keyInferences: "Mock Analysis.",
        additionalEffort: "Mock Analysis."
      },
      feedback: "Please provide a valid API Key to get real AI insights."
    };
  }

  // Fetch GitHub Content first
  let githubContext = "";
  if (submission.repoUrl && submission.repoUrl.includes("github.com")) {
      githubContext = await fetchGithubRepoContent(submission.repoUrl);
  } else {
      githubContext = "No valid GitHub URL provided.";
  }

  const parts: any[] = [];
  const tools: any[] = [];
  let useGoogleSearch = false;

  // 1. Attach Assignment PDF/File if exists
  if (assignment.assignmentFile) {
    const base64Data = assignment.assignmentFile.data.includes(',') 
        ? assignment.assignmentFile.data.split(',')[1] 
        : assignment.assignmentFile.data;
    
    parts.push({
        inlineData: {
          mimeType: assignment.assignmentFile.mimeType,
          data: base64Data
        }
      });
      parts.push({ text: `[SYSTEM] The above is the Assignment Brief document (${assignment.assignmentFile.name}).` });
  }

  // 2. Attach Student Report PDF/File if exists
  if (submission.reportFile) {
    const base64Data = submission.reportFile.data.includes(',') 
        ? submission.reportFile.data.split(',')[1] 
        : submission.reportFile.data;
    
    parts.push({
        inlineData: {
          mimeType: submission.reportFile.mimeType,
          data: base64Data
        }
      });
      parts.push({ text: `[SYSTEM] The above is the Student's Project Report file (${submission.reportFile.name}). Read this thoroughly. Analyze the text structure, arguments, AND any images/diagrams present in it.` });
  } else if (submission.reportLink) {
    // If file is missing but link exists, we MUST use Google Search to try and read it
    useGoogleSearch = true;
    parts.push({ text: `[SYSTEM] The student's report is hosted externally at: ${submission.reportLink}. You MUST use the Google Search tool to try and access the content of this document/page to evaluate it. If you cannot access it, grade based on what you can infer or mark as missing.` });
  }

  // 3. Attach Student Prompt Logs PDF/File if exists
  if (submission.promptLogFile) {
    const base64Data = submission.promptLogFile.data.includes(',') 
        ? submission.promptLogFile.data.split(',')[1] 
        : submission.promptLogFile.data;
    
    parts.push({
        inlineData: {
          mimeType: submission.promptLogFile.mimeType,
          data: base64Data
        }
      });
      parts.push({ text: `[SYSTEM] The above is the Student's AI Prompt/Chat Logs (${submission.promptLogFile.name}). Read this to evaluate their AI efficiency.` });
  } else if (submission.promptLogLink) {
     useGoogleSearch = true;
     parts.push({ text: `[SYSTEM] The student's AI prompt logs are at: ${submission.promptLogLink}. Use search to access if possible.` });
  }

  if (useGoogleSearch) {
      tools.push({ googleSearch: {} });
  }

  // 4. Construct the text prompt
  const prompt = `
    You are a STRICT, DETAIL-ORIENTED Computer Science Professor.
    Your job is to grade the student's submission rigorously against the specific learning outcomes and rubric.
    
    DO NOT act as a peer reviewer or a friendly coach. Act as an academic evaluator.

    ASSIGNMENT CONFIG:
    Title: ${assignment.title}
    Context: ${assignment.classContext}
    
    LEARNING OUTCOMES:
    ${assignment.learningOutcomes.map(l => `- ${l}`).join('\n')}

    INSTRUCTOR REMARKS (Source of Truth):
    "${assignment.additionalCriteria}"
    
    STUDENT SUBMISSION DATA:
    Name: ${submission.studentName}
    
    REPORT CONTENT (if not in file/link):
    "${submission.reportText.substring(0, 3000)}..."
    
    PROMPT LOGS (if not in file/link):
    "${submission.promptLog.substring(0, 3000)}..."

    === GITHUB REPOSITORY ANALYSIS ===
    I have fetched the following content directly from the student's repository.
    The content includes specific files marked with "--- START OF FILE: [name] ---".
    
    ${githubContext}
    
    ==================================

    GRADING PROTOCOL:
    1. **Code Verification:** Analyze the files provided above. For EACH file provided in the Github content, provide a specific critique. 
    2. **Content verification:** Compare the Report claims against the actual Code.
    3. **Tone Analysis:** Adhere to the strictness implied in the instructor's remarks. 
    4. **Process over Product:** Value reasoning.
    5. **Confidence Evaluation:** Determine a "confidenceScore" (0-100) based on the evidence available.
       - 100: Full Repo Access + Full Report + Full Prompt Logs
       - 70-80: Missing Repo or Logs, but strong report.
       - <50: Missing critical evidence.
    6. **Text Extraction:** Extract the first ~300 words of the actual student report text (or summary if text is sparse) into the "textSnippet" field. This is critical for plagiarism checking later.

    TASK:
    Generate a detailed grading analysis in JSON format.
    
    OUTPUT JSON STRUCTURE (Must be valid JSON):
    {
        "confidenceScore": 0,
        "textSnippet": "string (The actual text extracted from the start of the report, approx 300 words)",
        "scores": { "product": 0, "process": 0, "aiEfficiency": 0, "overall": 0 },
        "rubricBreakdown": [ { "criteria": "string", "score": 0, "max": 0, "comment": "string" } ],
        "aiInsights": { "summary": "string", "efficiencyBand": "string", "promptQuality": "string" },
        "codebaseVerification": {
             "githubStructure": "string",
             "scriptQuality": "string",
             "readmeCredibility": "string",
             "overallCredibility": "High/Medium/Low",
             "fileAnalyses": [
                { "fileName": "string", "critique": "string", "rating": "Excellent/Good/Fair/Poor" }
             ]
        },
        "reportAnalysis": {
            "structureQuality": "string",
            "visualEvidence": "string",
            "criteriaMet": ["string"],
            "criteriaMissed": ["string"],
            "keyInferences": "string",
            "additionalEffort": "string"
        },
        "feedback": "string"
    }
  `;

  parts.push({ text: prompt });

  const config: any = {};
  if (tools.length > 0) {
      config.tools = tools;
      // Note: When using tools, responseMimeType 'application/json' is often not supported or recommended 
      // as the model might need to output tool calls first. We rely on text parsing.
  } else {
      config.responseMimeType = "application/json";
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: config
    });

    let jsonStr = response.text || "{}";
    
    // Attempt to extract JSON if the model returns markdown code blocks (common when tools are used)
    const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || jsonStr.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
        // Fallback: Try to find the first '{' and last '}'
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            jsonStr = jsonStr.substring(start, end + 1);
        }
    }

    let parsed: any = {};
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parse failed", jsonStr);
        // Return a partial error object to UI
        parsed = { feedback: "Error parsing AI response. Please try again." };
    }
    
    // Construct valid result with fallbacks for every field to avoid crashes
    const result: AnalysisResult = {
        studentName: submission.studentName,
        confidenceScore: parsed.confidenceScore ?? 50,
        textSnippet: parsed.textSnippet || "No text available.",
        scores: { 
            product: parsed.scores?.product ?? 0, 
            process: parsed.scores?.process ?? 0, 
            aiEfficiency: parsed.scores?.aiEfficiency ?? 0, 
            overall: parsed.scores?.overall ?? 0 
        },
        rubricBreakdown: Array.isArray(parsed.rubricBreakdown) ? parsed.rubricBreakdown : [],
        aiInsights: { 
            summary: parsed.aiInsights?.summary || "No insights generated.", 
            efficiencyBand: parsed.aiInsights?.efficiencyBand || "Unknown", 
            promptQuality: parsed.aiInsights?.promptQuality || "Unknown" 
        },
        codebaseVerification: {
            githubStructure: parsed.codebaseVerification?.githubStructure || "Analysis failed.",
            scriptQuality: parsed.codebaseVerification?.scriptQuality || "Analysis failed.",
            readmeCredibility: parsed.codebaseVerification?.readmeCredibility || "Analysis failed.",
            overallCredibility: parsed.codebaseVerification?.overallCredibility || "Low",
            fileAnalyses: Array.isArray(parsed.codebaseVerification?.fileAnalyses) ? parsed.codebaseVerification.fileAnalyses : []
        },
        reportAnalysis: {
            structureQuality: parsed.reportAnalysis?.structureQuality || "Analysis failed.",
            visualEvidence: parsed.reportAnalysis?.visualEvidence || "Analysis failed.",
            criteriaMet: Array.isArray(parsed.reportAnalysis?.criteriaMet) ? parsed.reportAnalysis.criteriaMet : [],
            criteriaMissed: Array.isArray(parsed.reportAnalysis?.criteriaMissed) ? parsed.reportAnalysis.criteriaMissed : [],
            keyInferences: parsed.reportAnalysis?.keyInferences || "None.",
            additionalEffort: parsed.reportAnalysis?.additionalEffort || "None."
        },
        feedback: parsed.feedback || "Analysis could not be completed successfully."
    };

    return result;
  } catch (error) {
    console.error("Gemini Analysis Error", error);
    return {
        studentName: submission.studentName,
        confidenceScore: 0,
        textSnippet: "Analysis Failed.",
        scores: { product: 0, process: 0, aiEfficiency: 0, overall: 0 },
        rubricBreakdown: [],
        aiInsights: { summary: "Error analyzing.", efficiencyBand: "Error", promptQuality: "Error" },
        codebaseVerification: { 
            githubStructure: "Analysis Failed", 
            scriptQuality: "Analysis Failed", 
            readmeCredibility: "Analysis Failed", 
            overallCredibility: "Low",
            fileAnalyses: []
        },
        reportAnalysis: {
            structureQuality: "Analysis Failed",
            visualEvidence: "Analysis Failed",
            criteriaMet: [],
            criteriaMissed: [],
            keyInferences: "Analysis Failed",
            additionalEffort: "Analysis Failed"
        },
        feedback: "An error occurred during analysis. Please check the inputs."
    };
  }
};

// Global Chat Assistant with Class Context & App Manual
export const chatWithGlobalAssistant = async (
  query: string, 
  allStudents: AnalysisResult[], 
  assignmentConfig: AssignmentConfig
): Promise<string> => {
  const client = getClient();
  if (!client) return "I cannot assist you without a valid API Key.";

  try {
     const prompt = `
        You are an expert AI Teaching Assistant for the "IntegrityLens" grading platform.
        You have access to the grading data of the entire class for the current assignment.

        YOUR CAPABILITIES:
        1. **Assignment FAQs**: Answer questions about what the assignment was about (using the Config context).
        2. **Submission Insights**: Answer questions about specific students or class trends (using the Class Data).
        3. **App Navigation & Help**: Guide the user on where to find things in the dashboard (using the App Manual).

        === ASSIGNMENT CONTEXT (FAQs) ===
        Title: ${assignmentConfig.title}
        Class Level: ${assignmentConfig.classContext}
        Description: "${assignmentConfig.description.substring(0, 1000)}..."
        Learning Outcomes: ${assignmentConfig.learningOutcomes.join(", ")}
        Attached File: ${assignmentConfig.assignmentFile ? assignmentConfig.assignmentFile.name : "None"}

        === APP MANUAL & NAVIGATION GUIDE ===
        - **Dashboard Structure**: The dashboard has two modes: 
          1. **Grading View**: The default view to deeply analyze a single student.
          2. **Class Assistant**: The view you are currently in, for Q&A and broad analysis.
        - **Where to find things in Grading View**:
          - **Overview Tab**: Shows the radar chart, scores, and Professor's Feedback.
          - **GitHub Review Tab**: Shows analysis of the code structure, file quality, and credibility.
          - **Report Analysis Tab**: Shows if the student met criteria in their written report.
          - **Rubric Tab**: Shows the detailed point breakdown per criteria.
        - **Metric Definitions**:
          - **Product Score**: How good is the final code? Does it work?
          - **Process Score**: How good was the journey? Did they debug? Is the git history real?
          - **AI Efficiency**: 0-100%. High = Smart use of AI (Prompt Engineering). Low = Copy/Paste or over-reliance.
          - **AI Confidence Score**: How certain the AI is about its grading based on evidence (Repo, Logs, Report).
          
        === CLASS DATA (Student Submissions) ===
        ${JSON.stringify(allStudents.map(s => ({
            name: s.studentName,
            scores: s.scores,
            aiConfidence: s.confidenceScore,
            aiBand: s.aiInsights.efficiencyBand,
            feedback: s.feedback,
            repoCredibility: s.codebaseVerification.overallCredibility,
            rubric: s.rubricBreakdown.map(r => `${r.criteria}: ${r.score}/${r.max}`)
        })))}

        === USER QUERY ===
        "${query}"

        INSTRUCTIONS:
        - Be concise, professional, and helpful.
        - If the user asks "How do I see the code?", tell them to switch to 'Grading View' and click the 'GitHub Review' tab.
        - If the user asks about the assignment, quote the description or outcomes.
        - If comparing students, use specific numbers from the class data.
     `;

     const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
     });

     return response.text || "I couldn't generate a response.";
  } catch (e) {
     console.error("Chat Error", e);
     return "Sorry, I encountered an error communicating with the grading agent.";
  }
}