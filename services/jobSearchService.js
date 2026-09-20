const { discoverJobs } = require("./job/jobDiscovery.service");
const { normalizeJob } = require("./job/jobNormalizer.service");

async function searchJobs({ query, location, jobType, isRemote, page = 1, numPages = 2 }) {
  const rawJobs = await discoverJobs({ query, location, jobType, isRemote, page });
  return rawJobs.map((job) => normalizeJob(job, "jsearch"));
}

async function searchJobsByResume(resumeParsed, options = {}) {
  const topSkills = (resumeParsed.techStack || resumeParsed.skills || []).slice(0, 3).join(" ");
  const topRole = (resumeParsed.targetRoles || [])[0] || `${resumeParsed.seniorityLevel || "software"} developer`;
  const query = options.query || `${topRole} ${topSkills}`.trim();
  return searchJobs({ ...options, query });
}

module.exports = { searchJobs, searchJobsByResume };
