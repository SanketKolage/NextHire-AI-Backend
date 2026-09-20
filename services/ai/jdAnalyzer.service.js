function sanitizePromptInput(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .slice(0, 12000);
}

function extractRoleSignals(job = {}) {
  const text = `${job.title || ""} ${job.description || ""} ${job.requirements?.join(" ") || ""}`.toLowerCase();
  return {
    title: job.title || "",
    description: job.description || "",
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    technologies: Array.from(new Set((job.skills || []).concat(job.requirements || []).join(" ").match(/[A-Za-z0-9.+#/:-]{2,}/g) || [])).slice(0, 20),
    seniority: /senior|lead|principal|staff/.test(text) ? "senior" : /mid|intermediate/.test(text) ? "mid" : "entry-level",
    domain: /ai|ml|genai|data|security|fintech|healthcare|cloud|devops/.test(text) ? "technology" : "general",
    keywords: Array.from(new Set((job.requirements || []).concat(job.skills || []).map((item) => String(item).trim()).filter(Boolean))).slice(0, 20),
  };
}

function analyzeJobDescription(resumeParsed = {}, job = {}) {
  const safeJob = {
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    description: sanitizePromptInput(job.description || ""),
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    skills: Array.isArray(job.skills) ? job.skills : [],
    remoteType: job.remoteType || (job.isRemote ? "remote" : "unknown"),
  };

  const signals = extractRoleSignals(safeJob);
  const resumeSkills = [...new Set([...(resumeParsed.skills || []), ...(resumeParsed.techStack || []), ...(resumeParsed.technicalSkills || [])])];
  const keywordsPresent = signals.keywords.filter((keyword) =>
    resumeSkills.some((skill) => skill.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skill.toLowerCase()))
  );
  const missingRequirements = signals.keywords.filter((keyword) => !keywordsPresent.includes(keyword));

  return {
    jobTitle: safeJob.title,
    company: safeJob.company,
    location: safeJob.location,
    matchSummary: `Role requires ${signals.keywords.slice(0, 5).join(", ") || "core product skills"}.`,
    keywordsPresent,
    missingRequirements: missingRequirements.slice(0, 8),
    requiredSkills: signals.keywords.slice(0, 12),
    seniority: signals.seniority,
    domain: signals.domain,
    technologies: signals.technologies.slice(0, 10),
    responsibilities: signals.responsibilities.slice(0, 8),
    atsRecommendations: [
      "Lead with the most relevant role-specific keywords in summary and experience bullets.",
      "Use the exact technology names from the JD, where they match real experience.",
      "Emphasize measurable impact and project outcomes that align with the job responsibilities.",
    ],
    truthGuard: "This analysis only uses information present in the user's stored resume/profile and job description without inventing experience.",
  };
}

module.exports = { analyzeJobDescription };
