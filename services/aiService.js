const { GoogleGenAI } = require("@google/genai");

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
  const prompt = `
You are an ATS and recruiter expert.

Evaluate how well the candidate matches the job.

Return ONLY valid JSON.

{
  "score": 0,
  "strengths": [],
  "gaps": [],
  "recommendation": "",
  "shouldApply": true
}

Candidate:
${JSON.stringify(resumeParsed, null, 2)}

Job:
${JSON.stringify(jobDetails, null, 2)}
`;

  return await generateJSON(prompt);
}

// ─────────────────────────────────────────────────────────────
// 3. Cover Letter
// ─────────────────────────────────────────────────────────────
async function generateCoverLetter(resumeParsed, jobDetails) {
  const prompt = `
Write a professional cover letter.

Requirements:
- 3 to 4 paragraphs
- Professional tone
- Tailored to the job
- Show relevant experience
- End with a call to action
- No markdown

Candidate:
${JSON.stringify(resumeParsed, null, 2)}

Job:
${JSON.stringify(jobDetails, null, 2)}
`;

  return await generateText(prompt);
}

// ─────────────────────────────────────────────────────────────
// 4. Resume Tailoring Suggestions
// ─────────────────────────────────────────────────────────────
async function generateTailoringSuggestions(
  resumeParsed,
  jobDetails
) {
  const prompt = `
You are an ATS optimization expert.

Return ONLY valid JSON.

{
  "suggestions": [],
  "keywordsToAdd": [],
  "keywordsPresent": [],
  "atsScore": 0,
  "priorityActions": []
}

Candidate:
${JSON.stringify(resumeParsed, null, 2)}

Job:
${JSON.stringify(jobDetails, null, 2)}
`;

  return await generateJSON(prompt);
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
module.exports = {
  parseResume,
  scoreJobMatch,
  generateCoverLetter,
  generateTailoringSuggestions,
  generateApplicationEmail,
  batchScoreJobs,
};