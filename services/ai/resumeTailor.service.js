function unique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).filter(Boolean).map((v) => String(v).trim()).filter(Boolean))];
}

function buildTailoredResume(resumeParsed = {}, job = {}) {
  const profileSkills = unique([...(resumeParsed.skills || []), ...(resumeParsed.techStack || []), ...(resumeParsed.technicalSkills || [])]);
  const jobKeywords = unique([...(job.skills || []), ...(job.requirements || []), ...(job.responsibilities || [])]);
  const relevantSkills = jobKeywords.filter((keyword) =>
    profileSkills.some((skill) => skill.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skill.toLowerCase()))
  );

  const summary = resumeParsed.summary || `Experienced ${resumeParsed.currentRole || resumeParsed.seniorityLevel || "technology professional"} with ${resumeParsed.totalYearsExperience || 0} years of experience in ${relevantSkills.slice(0, 4).join(", ") || "software development"}.`;

  const experience = (resumeParsed.experience || []).map((exp) => ({
    company: exp.company || "",
    title: exp.title || "",
    startDate: exp.startDate || "",
    endDate: exp.endDate || "",
    description: Array.isArray(exp.highlights) && exp.highlights.length
      ? exp.highlights.slice(0, 3).join(" ")
      : exp.description || "",
  }));

  const projects = (resumeParsed.projects || [])?.length ? resumeParsed.projects : [];

  return {
    matchAnalysis: {
      summary: `This resume emphasizes ${relevantSkills.slice(0, 5).join(", ") || "core technical capabilities"} for the ${job.title || "target role"} position.`,
      suggestedSummary: summary,
      relevantSkills: relevantSkills.slice(0, 10),
      relevantExperienceBullets: experience.slice(0, 3).map((item) => `${item.title || "Role"} at ${item.company || "Company"}`),
      relevantProjects: projects.slice(0, 3),
      missingRequirements: jobKeywords.filter((keyword) => !relevantSkills.includes(keyword)).slice(0, 6),
      atsRecommendations: [
        "Mirror JD keywords naturally in the summary and skills section.",
        "Use the exact tools and technologies that appear in the job description when they match your real profile.",
        "Keep bullets concise and measurable to improve ATS scanning.",
      ],
    },
    summary,
    skills: relevantSkills.slice(0, 12),
    experience,
    projects,
    missingRequirements: jobKeywords.filter((keyword) => !relevantSkills.includes(keyword)).slice(0, 6),
    atsRecommendations: [
      "Mirror JD keywords naturally in the summary and skills section.",
      "Use the exact tools and technologies that appear in the job description when they match your real profile.",
      "Keep bullets concise and measurable to improve ATS scanning.",
    ],
    truthGuard: "Generated content is based only on the user’s real resume/profile and the job description.",
  };
}

module.exports = { buildTailoredResume };
