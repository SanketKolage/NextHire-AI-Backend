const { GoogleGenAI } = require("@google/genai");
const { buildJobMatchAnalysis } = require("./job/jobMatcher.service");
const { analyzeJobDescription } = require("./ai/jdAnalyzer.service");
const { buildTailoredResume } = require("./ai/resumeTailor.service");
const { buildCoverLetterText } = require("./ai/coverLetter.service");
const { buildAnswer, isPersonalOrLegalQuestion } = require("./ai/applicationAnswer.service");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-2.5-flash";

async function generateJSON(prompt, retries = 3) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text);
  } catch (err) {
    if (
      retries > 0 &&
      (err.message?.includes("503") ||
        err.message?.includes("UNAVAILABLE"))
    ) {
      console.log(`Retrying Gemini request... (${retries} left)`);

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );

      return generateJSON(prompt, retries - 1);
    }

    throw err;
  }
}
async function generateTailoredResume(
  resumeParsed,
  jobDetails
) {
  const fallback = buildTailoredResume(resumeParsed, jobDetails);

  const prompt = `
You are an ATS optimization expert.

Rewrite the resume to maximize ATS score.

Rules:
- Never invent skills or experience.
- Never invent projects or certifications.
- Only use information present in the candidate profile and job description.
- Reorder skills based on JD relevance.
- Rewrite summary and bullets for ATS clarity.
- Return ONLY valid JSON.

{
  "summary": "",
  "skills": [],
  "experience": [],
  "projects": [],
  "atsScore": 0,
  "matchAnalysis": {
    "summary": "",
    "suggestedSummary": "",
    "relevantSkills": [],
    "relevantExperienceBullets": [],
    "relevantProjects": [],
    "missingRequirements": [],
    "atsRecommendations": []
  }
}

Resume:
${JSON.stringify(resumeParsed)}

Job:
${JSON.stringify(jobDetails)}
`;

  try {
    const aiResult = await generateJSON(prompt);
    return {
      ...fallback,
      ...aiResult,
      summary: aiResult.summary || fallback.summary,
      skills: Array.isArray(aiResult.skills) && aiResult.skills.length ? aiResult.skills : fallback.skills,
      experience: Array.isArray(aiResult.experience) && aiResult.experience.length ? aiResult.experience : fallback.experience,
      projects: Array.isArray(aiResult.projects) && aiResult.projects.length ? aiResult.projects : fallback.projects,
      atsScore: typeof aiResult.atsScore === "number" ? aiResult.atsScore : 85,
      matchAnalysis: aiResult.matchAnalysis || fallback.matchAnalysis,
    };
  } catch (error) {
    return fallback;
  }
}
// ─────────────────────────────────────────────────────────────
// Generic Text Generator
// ─────────────────────────────────────────────────────────────
async function generateText(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  return response.text.trim();
}

// ─────────────────────────────────────────────────────────────
// 1. Parse Resume
// ─────────────────────────────────────────────────────────────
async function parseResume(rawText) {
  const prompt = `
You are an expert resume parser.

Extract structured information from the resume below.

Return ONLY valid JSON.

seniorityLevel MUST be exactly one of:

Junior
Mid
Senior
Lead
Principal
Executive

Do not return values like:
Junior Developer
Senior Engineer
Lead Developer

{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedIn": "",
  "github": "",
  "portfolio": "",
  "summary": "",
  "skills": [],
  "techStack": [],
  "experience": [],
  "education": [],
  "certifications": [],
  "languages": [],
  "totalYearsExperience": 0,
  "seniorityLevel": "",
  "targetRoles": [],
  "industryFocus": []
}

Resume:
${rawText}
`;

  return await generateJSON(prompt);
}

// ─────────────────────────────────────────────────────────────
// 2. Score Job Match
// ─────────────────────────────────────────────────────────────
async function scoreJobMatch(resumeParsed, jobDetails) {
  const fallbackMatch = buildJobMatchAnalysis(resumeParsed, jobDetails);

  try {
    const prompt = `
You are an ATS and recruiter expert.

Evaluate how well the candidate matches the job.

Rules:
- Only use real evidence from the candidate profile and job data.
- Do not invent skills, experience, or education.
- Return ONLY valid JSON.
- Keep explanations truthful.

{
  "score": 0,
  "strengths": [],
  "gaps": [],
  "recommendation": "",
  "shouldApply": true,
  "explanation": ""
}

Candidate:
${JSON.stringify(resumeParsed, null, 2)}

Job:
${JSON.stringify(jobDetails, null, 2)}
`;

    const aiResult = await generateJSON(prompt);
    return {
      ...fallbackMatch,
      ...aiResult,
      score: typeof aiResult.score === "number" ? aiResult.score : fallbackMatch.score,
      strengths: Array.isArray(aiResult.strengths) && aiResult.strengths.length ? aiResult.strengths : fallbackMatch.strengths,
      gaps: Array.isArray(aiResult.gaps) && aiResult.gaps.length ? aiResult.gaps : fallbackMatch.gaps,
      recommendation: aiResult.recommendation || fallbackMatch.recommendation,
      shouldApply: typeof aiResult.shouldApply === "boolean" ? aiResult.shouldApply : fallbackMatch.shouldApply,
      explanation: aiResult.explanation || fallbackMatch.explanation,
      overallMatchScore: typeof aiResult.score === "number" ? aiResult.score : fallbackMatch.overallMatchScore,
      skillMatchScore: fallbackMatch.skillMatchScore,
      experienceMatchScore: fallbackMatch.experienceMatchScore,
      locationMatchScore: fallbackMatch.locationMatchScore,
      titleMatchScore: fallbackMatch.titleMatchScore,
      educationMatchScore: fallbackMatch.educationMatchScore,
      preferenceMatchScore: fallbackMatch.preferenceMatchScore,
    };
  } catch (error) {
    return fallbackMatch;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Cover Letter
// ─────────────────────────────────────────────────────────────
async function generateCoverLetter(resumeParsed, jobDetails, options = {}) {
  const tone = options.tone || "Professional";
  const fallback = buildCoverLetterText(resumeParsed, jobDetails, tone);

  const prompt = `
Write a concise, truthful cover letter.

Requirements:
- 3 to 4 paragraphs
- Tone: ${tone}
- Mention the company and role
- Only use facts from the candidate profile and job description
- Do not invent experience, projects, or certifications
- End with a clear call to action
- No markdown

Candidate:
${JSON.stringify(resumeParsed, null, 2)}

Job:
${JSON.stringify(jobDetails, null, 2)}
`;

  try {
    const generated = await generateText(prompt);
    if (generated && generated.length > 20) return generated;
    return fallback;
  } catch (error) {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Resume Tailoring Suggestions
// ─────────────────────────────────────────────────────────────
async function generateTailoringSuggestions(
  resumeParsed,
  jobDetails
) {
  const fallback = buildTailoredResume(resumeParsed, jobDetails);
  const jdAnalysis = analyzeJobDescription(resumeParsed, jobDetails);

  const prompt = `
You are an ATS optimization expert.

Return ONLY valid JSON.

{
  "suggestions": [],
  "keywordsToAdd": [],
  "keywordsPresent": [],
  "atsScore": 0,
  "priorityActions": [],
  "matchAnalysis": {
    "summary": "",
    "suggestedSummary": "",
    "relevantSkills": [],
    "relevantExperienceBullets": [],
    "relevantProjects": [],
    "missingRequirements": [],
    "atsRecommendations": []
  }
}

Candidate:
${JSON.stringify(resumeParsed, null, 2)}

Job:
${JSON.stringify(jobDetails, null, 2)}
`;

  try {
    const aiResult = await generateJSON(prompt);
    return {
      ...fallback,
      ...aiResult,
      suggestions: Array.isArray(aiResult.suggestions) && aiResult.suggestions.length ? aiResult.suggestions : [
        `Emphasize ${jdAnalysis.requiredSkills.slice(0, 4).join(", ") || "core role skills"} in the summary and experience section.`,
        `Use the exact job keywords where they align with your real experience.`,
      ],
      keywordsToAdd: Array.isArray(aiResult.keywordsToAdd) && aiResult.keywordsToAdd.length ? aiResult.keywordsToAdd : jdAnalysis.missingRequirements.slice(0, 5),
      keywordsPresent: Array.isArray(aiResult.keywordsPresent) && aiResult.keywordsPresent.length ? aiResult.keywordsPresent : jdAnalysis.keywordsPresent.slice(0, 5),
      atsScore: typeof aiResult.atsScore === "number" ? aiResult.atsScore : 85,
      priorityActions: Array.isArray(aiResult.priorityActions) && aiResult.priorityActions.length ? aiResult.priorityActions : [
        "Rewrite the summary using the JD keywords that match your background.",
        "Highlight the most relevant technologies in the skills and experience section.",
      ],
      matchAnalysis: aiResult.matchAnalysis || fallback.matchAnalysis,
    };
  } catch (error) {
    return {
      ...fallback,
      suggestions: [
        `Emphasize ${jdAnalysis.requiredSkills.slice(0, 4).join(", ") || "core role skills"} in the summary and experience section.`,
        `Use the exact job keywords where they align with your real experience.`,
      ],
      keywordsToAdd: jdAnalysis.missingRequirements.slice(0, 5),
      keywordsPresent: jdAnalysis.keywordsPresent.slice(0, 5),
      atsScore: 85,
      priorityActions: [
        "Rewrite the summary using the JD keywords that match your background.",
        "Highlight the most relevant technologies in the skills and experience section.",
      ],
      matchAnalysis: fallback.matchAnalysis,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Application Email
// ─────────────────────────────────────────────────────────────
async function generateApplicationEmail(
  resumeParsed,
  jobDetails
) {
  const prompt = `
Write a job application email.

Return ONLY valid JSON.

{
  "subject": "",
  "intro": ""
}

Candidate Name:
${resumeParsed.name}

Job Title:
${jobDetails.title}

Company:
${jobDetails.company}
`;

  return await generateJSON(prompt);
}

// ─────────────────────────────────────────────────────────────
// 6. Batch Score Jobs
// ─────────────────────────────────────────────────────────────
async function batchScoreJobs(resumeParsed, jobs) {
  const results = [];

  for (const job of jobs) {
    try {
      const match = await scoreJobMatch(
        resumeParsed,
        job
      );

      results.push({
        jobId: job._id,
        ...match,
      });
    } catch (err) {
      console.error(
        `Error scoring job ${job._id}:`,
        err.message
      );

      results.push({
        jobId: job._id,
        score: 0,
        strengths: [],
        gaps: ["Failed to score this job"],
        recommendation: "Unable to evaluate",
        shouldApply: false,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
async function generateApplicationAnswers(resumeParsed, questions = []) {
  if (!Array.isArray(questions) || !questions.length) {
    return [];
  }

  return questions.map((question) => {
    const answer = buildAnswer(resumeParsed, question);
    return {
      question,
      answer: answer.answer,
      requiresUserInput: answer.requiresUserInput || isPersonalOrLegalQuestion(question),
    };
  });
}

module.exports = {
  parseResume,
  scoreJobMatch,
  generateCoverLetter,
  generateTailoringSuggestions,
  generateApplicationEmail,
  batchScoreJobs,
  generateTailoredResume,
  generateApplicationAnswers,
};