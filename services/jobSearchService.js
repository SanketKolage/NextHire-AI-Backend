const axios = require("axios");

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "jsearch.p.rapidapi.com";

// ── Search Jobs via JSearch API ────────────────────────────────────────────────
async function searchJobs({ query, location, jobType, isRemote, page = 1, numPages = 2 }) {
  if (!RAPIDAPI_KEY) {
    throw new Error(
      "RAPIDAPI_KEY not configured. Please add it to your .env file. Get a free key at https://rapidapi.com/letscrape-6baf62aa91515f36e4f06cde/api/jsearch"
    );
  }

  const params = {
    query: query || "software developer",
    page: String(page),
    num_pages: String(numPages),
    date_posted: "month",
    remote_jobs_only: isRemote ? "true" : "false",
  };

  if (location) params.location = location;
  if (jobType) params.employment_types = jobType.toUpperCase();

  const response = await axios.get(`https://${RAPIDAPI_HOST}/search`, {
    params,
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
  });

  return normalizeJSearchResults(response.data.data || []);
}

// ── Search Jobs by Skills (auto-generates query from resume) ──────────────────
async function searchJobsByResume(resumeParsed, options = {}) {
  const topSkills = (resumeParsed.techStack || resumeParsed.skills || []).slice(0, 3).join(" ");
  const topRole = (resumeParsed.targetRoles || [])[0] || resumeParsed.seniorityLevel + " developer";

  const query = options.query || `${topRole} ${topSkills}`.trim();
  return searchJobs({ ...options, query });
}

// ── Normalize JSearch API response to our Job schema ─────────────────────────
function normalizeJSearchResults(items) {
  return items.map((item) => ({
    externalId: item.job_id,
    source: "jsearch",
    title: item.job_title || "Unknown Title",
    company: item.employer_name || "Unknown Company",
    location: item.job_city
      ? `${item.job_city}, ${item.job_state || item.job_country || ""}`
      : item.job_country || "Remote",
    isRemote: item.job_is_remote || false,
    jobType: formatJobType(item.job_employment_type),
    salaryMin: item.job_min_salary || null,
    salaryMax: item.job_max_salary || null,
    salaryCurrency: item.job_salary_currency || "USD",
    description: item.job_description || "",
    requirements: extractRequirements(item),
    responsibilities: extractResponsibilities(item),
    benefits: item.job_benefits || [],
    applyUrl: item.job_apply_link || item.job_google_link || "",
    companyLogo: item.employer_logo || null,
    companyWebsite: item.employer_website || null,
    postedAt: item.job_posted_at_datetime_utc
      ? new Date(item.job_posted_at_datetime_utc)
      : new Date(),
  }));
}

function formatJobType(type) {
  const map = {
    FULLTIME: "Full-time",
    PARTTIME: "Part-time",
    CONTRACTOR: "Contract",
    INTERN: "Internship",
  };
  return map[type] || type || "Full-time";
}

function extractRequirements(item) {
  const reqs = item.job_required_skills || [];
  if (item.job_highlights?.Qualifications) {
    return [...reqs, ...item.job_highlights.Qualifications].slice(0, 10);
  }
  return reqs.slice(0, 10);
}

function extractResponsibilities(item) {
  if (item.job_highlights?.Responsibilities) {
    return item.job_highlights.Responsibilities.slice(0, 8);
  }
  return [];
}

module.exports = { searchJobs, searchJobsByResume };
