const Job = require("../../models/Job");

async function findDuplicate(source, sourceJobId) {
  if (!source || !sourceJobId) return null;
  return Job.findOne({ source, sourceJobId });
}

async function upsertUniqueJobs(jobs = []) {
  const saved = [];

  for (const job of jobs) {
    if (!job?.source || !job?.sourceJobId) continue;

    const existing = await findDuplicate(job.source, job.sourceJobId);
    if (existing) {
      Object.assign(existing, job);
      await existing.save();
      saved.push(existing);
      continue;
    }

    const created = new Job(job);
    await created.save();
    saved.push(created);
  }

  return saved;
}

module.exports = { findDuplicate, upsertUniqueJobs };
