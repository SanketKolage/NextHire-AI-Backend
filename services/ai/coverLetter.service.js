function sanitize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pickRelevantSkills(resumeParsed = {}, jobDetails = {}) {
  const allSkills = [...(resumeParsed.skills || []), ...(resumeParsed.techStack || []), ...(resumeParsed.technicalSkills || [])];
  const jobKeywords = [...(jobDetails.skills || []), ...(jobDetails.requirements || [])].map((item) => String(item).trim()).filter(Boolean);

  const matches = allSkills.filter((skill) =>
    jobKeywords.some((keyword) => skill.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skill.toLowerCase()))
  );

  return matches.length ? matches.slice(0, 5) : allSkills.slice(0, 5);
}

function buildCoverLetterText(resumeParsed = {}, jobDetails = {}, tone = "Professional") {
  const candidateName = sanitize(resumeParsed.name) || "Candidate";
  const role = sanitize(jobDetails.title) || "the opportunity";
  const company = sanitize(jobDetails.company) || "your company";
  const location = sanitize(jobDetails.location) || "";
  const relevantSkills = pickRelevantSkills(resumeParsed, jobDetails);
  const experienceYears = Number(resumeParsed.totalYearsExperience || resumeParsed.yearsOfExperience || 0);
  const summary = sanitize(resumeParsed.summary) || `I bring ${experienceYears || "several"} years of experience in software and product engineering.`;
  const introTone = {
    Professional: "I am writing to express my interest in the",
    Confident: "I am excited to apply for the",
    Concise: "I am interested in the",
    Startup: "I’m excited to join the team behind the",
    Corporate: "I am writing to express my interest in the",
  };

  const first = `${introTone[tone] || introTone.Professional} ${role} role at ${company}${location ? `, based in ${location}` : ""}. ${summary}`;
  const second = `My background includes work with ${relevantSkills.join(", ") || "core modern software technologies"}, and I have focused on building reliable, user-centered products and solutions that align with business goals. This opportunity stands out because it combines strong technical execution with meaningful product impact.`;
  const third = `I would welcome the opportunity to bring my experience, collaborative working style, and problem-solving approach to ${company}. Thank you for considering my application. I would be glad to discuss how my background can support your team’s goals.`;

  return `${first}\n\n${second}\n\n${third}`;
}

module.exports = { buildCoverLetterText };
