const axios = require("axios");

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "jsearch.p.rapidapi.com";

async function searchJSearch({ query, location, jobType, isRemote, page = 1, numPages = 2 }) {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY not configured. Please add it to your .env file.");
  }

  const params = {
    query: query || "software developer",
    page: String(page),
    num_pages: String(numPages),
    date_posted: "month",
    remote_jobs_only: isRemote ? "true" : "false",
  };

  if (location) params.location = location;
  if (jobType) params.employment_types = String(jobType).toUpperCase();

  const response = await axios.get(`https://${RAPIDAPI_HOST}/search`, {
    params,
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    timeout: 15000,
  });

  return (response.data?.data || []).map((item) => ({
    title: item.job_title || "Unknown Title",
    company: item.employer_name || "Unknown Company",
    location: item.job_city ? `${item.job_city}${item.job_state ? `, ${item.job_state}` : ""}${item.job_country && !item.job_state ? `, ${item.job_country}` : ""}` : item.job_country || "Remote",
    remoteType: item.job_is_remote ? "remote" : "unknown",
    jobType: item.job_employment_type || "Full-time",
    salaryMin: item.job_min_salary || 0,
    salaryMax: item.job_max_salary || 0,
    salaryCurrency: item.job_salary_currency || "USD",
    description: item.job_description || "",
    requirements: item.job_required_skills || [],
    responsibilities: item.job_highlights?.Responsibilities || [],
    skills: item.job_required_skills || [],
    source: "jsearch",
    sourceJobId: item.job_id,
    applicationUrl: item.job_apply_link || item.job_google_link || "",
    companyLogo: item.employer_logo || null,
    companyWebsite: item.employer_website || null,
    postedDate: item.job_posted_at_datetime_utc || new Date(),
    foundAt: new Date(),
    isRemote: Boolean(item.job_is_remote),
    remote: item.job_is_remote ? "remote" : "",
    salary: {
      min: Number(item.job_min_salary || 0),
      max: Number(item.job_max_salary || 0),
      currency: item.job_salary_currency || "USD",
    },
    experienceRequired: item.job_required_experience || "",
  }));
}

async function discoverJobs({ query, location, jobType, isRemote, page = 1 }) {
  return searchJSearch({ query, location, jobType, isRemote, page });
}

module.exports = { discoverJobs, searchJSearch };
