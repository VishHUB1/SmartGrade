import { GoogleGenAI, Type } from "@google/genai";
import { AssignmentConfig, StudentSubmission, AnalysisResult } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
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

export const analyzeSubmission = async (
  assignment: AssignmentConfig,
  submission: StudentSubmission
): Promise<AnalysisResult> => {
  const client = getClient();
  // Fallback to mock if no API key or error
  if (!client) {
    return {
      studentName: submission.studentName,
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
         overallCredibility: "Medium"
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

  const parts: any[] = [];

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
  }

  // 4. Construct the text prompt
  const prompt = `
    You are a STRICT, DETAIL-ORIENTED Computer Science Professor.
    Your job is to grade the student's submission rigorously against the specific learning outcomes and rubric.
    
    DO NOT act as a peer reviewer or a friendly coach. Act as an academic evaluator.
    DO NOT assume the student did the work just because they used a heading. VERIFY THE CONTENT.

    ASSIGNMENT CONFIG:
    Title: ${assignment.title}
    Context: ${assignment.classContext}
    
    LEARNING OUTCOMES (Must be demonstrated in the work):
    ${assignment.learningOutcomes.map(l => `- ${l}`).join('\n')}

    INSTRUCTOR RUBRIC & REMARKS (The Source of Truth):
    "${assignment.additionalCriteria}"
    
    GRADING PROTOCOL:
    1. **Strict Adherence:** If the instructor provided a Rubric with point values, follow it precisely.
    2. **Content verification:** If a student claims "I implemented OAuth", check the report/codebase for actual evidence (diagrams, code snippets, specific explanation of challenges). If the text is vague or generic ("I used OAuth because it is secure"), MARK IT DOWN for lack of depth.
    3. **Tone Analysis:** Adhere to the strictness implied in the instructor's remarks. If they seem annoyed by AI copying, be very harsh on the "AI Efficiency" score if the prompt logs show lazy copying.
    4. **Process over Product:** Unless stated otherwise, value the *reasoning* in the report. A perfect app with a generated report is a low grade. A buggy app with a brilliant post-mortem analysis is a higher grade (depending on context).

    (Note: Also consider the attached assignment document if provided above)

    STUDENT SUBMISSION DATA:
    Name: ${submission.studentName}
    GitHub URL: ${submission.repoUrl}
    
    Report Text (if not in file):
    "${submission.reportText.substring(0, 2000)}..."
    
    Prompt Log Text (if not in file):
    "${submission.promptLog.substring(0, 2000)}..."

    TASK:
    Generate a detailed grading analysis in JSON format.
    
    DEEP REPORT ANALYSIS (Very Important):
    Scan the student's report (PDF or text).
    1. Structure: Is it professional?
    2. Visual Evidence: Do not just say "images present". Analyze what the screenshots/diagrams *prove*. Do they show the student's specific implementation or generic placeholders?
    3. Criteria Check: List exactly which requirements were MET (with evidence) and which were MISSED (or vaguely addressed).
    4. Inferences: Read between the lines. Does the student *understand* the code they submitted?
    
    CODEBASE VERIFICATION (CRITICAL):
    You MUST use the Google Search tool to verify the GitHub Repository: "${submission.repoUrl}".
    
    Search Queries to perform:
    1. "${submission.repoUrl}"
    2. "site:github.com ${submission.repoUrl} readme"
    
    Action:
    - If search results are found: Analyze the snippets for file structure, languages used, and README quality.
    - If NO search results are found (repo is too new): DO NOT FAIL. State "Repo not indexed by search engine, assumed valid for grading" but mark 'overallCredibility' as "Unverified" or "Medium" rather than Low, unless other red flags exist.
    - DO NOT HALLUCINATE: If you can't see the code, verify what you can from the search snippets and the student's own report description.
    
    OUTPUT JSON STRUCTURE:
    1. scores (product, process, aiEfficiency, overall)
    2. rubricBreakdown (array of criteria, score, max, comment)
    3. aiInsights (summary, efficiencyBand, promptQuality)
    4. codebaseVerification (githubStructure, scriptQuality, readmeCredibility, overallCredibility)
    5. reportAnalysis (structureQuality, visualEvidence, criteriaMet [array], criteriaMissed [array], keyInferences, additionalEffort)
    6. feedback (Direct, academic feedback to the student. Be constructive but point out specific weaknesses in their explanation or evidence).
  `;

  parts.push({ text: prompt });

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType is NOT allowed with googleSearch
      }
    });

    let jsonStr = response.text || "{}";
    
    // Attempt to extract JSON if the model returns markdown code blocks
    const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            jsonStr = jsonStr.substring(start, end + 1);
        }
    }

    const result = JSON.parse(jsonStr);
    result.studentName = submission.studentName;
    return result;
  } catch (error) {
    console.error("Gemini Analysis Error", error);
    return {
        studentName: submission.studentName,
        scores: { product: 0, process: 0, aiEfficiency: 0, overall: 0 },
        rubricBreakdown: [],
        aiInsights: { summary: "Error analyzing.", efficiencyBand: "Error", promptQuality: "Error" },
        codebaseVerification: { 
            githubStructure: "Analysis Failed", 
            scriptQuality: "Analysis Failed", 
            readmeCredibility: "Analysis Failed", 
            overallCredibility: "Low" 
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