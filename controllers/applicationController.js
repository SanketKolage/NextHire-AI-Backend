const Application = require("../models/Application");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const aiService = require("../services/aiService");
const emailService = require("../services/emailService");

// ── POST /api/applications ─────────────────────────────────────────────────────
exports.createApplication = async (req, res) => {
  try {
    const { resumeId, jobId, priority } = req.body;

    const existing = await Application.findOne({ resumeId, jobId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Application already exists", application: existing });
    }

    const application = new Application({ resumeId, jobId, priority: priority || "medium" });
    await application.save();

    res.status(201).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/applications ──────────────────────────────────────────────────────
exports.getApplications = async (req, res) => {
  try {
    const { status, resumeId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (resumeId) filter.resumeId = resumeId;

    const applications = await Application.find(filter)
      .populate("resumeId", "parsed.name parsed.email fileName")
      .populate("jobId", "title company location jobType applyUrl companyLogo aiMatch isRemote")
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/applications/:id ──────────────────────────────────────────────────
exports.getApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("resumeId")
      .populate("jobId");
    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/applications/:id/status ────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = { status };
    if (notes) update.notes = notes;
    if (status === "applied") update.appliedAt = new Date();

    const application = await Application.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/applications/:id/cover-letter ────────────────────────────────────
exports.generateCoverLetter = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("resumeId")
      .populate("jobId");

    if (!application) return res.status(404).json({ success: false, message: "Not found" });
    if (!application.resumeId?.parsed) return res.status(400).json({ success: false, message: "Resume not parsed" });

    const content = await aiService.generateCoverLetter(
      application.resumeId.parsed,
      application.jobId
    );

    application.coverLetter = { content, generatedAt: new Date(), customized: false };
    await application.save();

    res.json({ success: true, coverLetter: application.coverLetter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/applications/:id/tailoring ──────────────────────────────────────
exports.generateTailoring = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("resumeId")
      .populate("jobId");

    if (!application) return res.status(404).json({ success: false, message: "Not found" });

    const suggestions = await aiService.generateTailoringSuggestions(
      application.resumeId.parsed,
      application.jobId
    );

    application.resumeTailoring = { ...suggestions, generatedAt: new Date() };
    await application.save();

    res.json({ success: true, tailoring: application.resumeTailoring });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/applications/:id/send-email ─────────────────────────────────────
exports.sendEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: "Recipient email required" });

    const application = await Application.findById(req.params.id)
      .populate("resumeId")
      .populate("jobId");

    if (!application?.coverLetter?.content) {
      return res.status(400).json({ success: false, message: "Generate a cover letter first" });
    }

    const emailMeta = await aiService.generateApplicationEmail(
      application.resumeId.parsed,
      application.jobId,
      application.coverLetter.content
    );

    await emailService.sendApplicationEmail({
      to,
      subject: emailMeta.subject,
      intro: emailMeta.intro,
      coverLetter: application.coverLetter.content,
      resumeFilePath: application.resumeId.filePath,
      candidateName: application.resumeId.parsed.name,
      candidateEmail: application.resumeId.parsed.email,
    });

    application.status = "applied";
    application.appliedAt = new Date();
    application.appliedVia = "email";
    application.applicationUrl = `mailto:${to}`;
    await application.save();

    res.json({ success: true, message: "Application email sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/applications/:id/follow-up ──────────────────────────────────────
exports.addFollowUp = async (req, res) => {
  try {
    const { type, notes, to } = req.body;

    const application = await Application.findById(req.params.id)
      .populate("resumeId")
      .populate("jobId");

    if (!application) return res.status(404).json({ success: false, message: "Not found" });

    // Send follow-up email if email type and recipient
    if (type === "email" && to) {
      await emailService.sendFollowUpEmail({
        to,
        candidateName: application.resumeId.parsed.name,
        candidateEmail: application.resumeId.parsed.email,
        jobTitle: application.jobId.title,
        companyName: application.jobId.company,
        appliedDate: application.appliedAt?.toLocaleDateString() || "recently",
      });
    }

    application.followUps.push({ date: new Date(), type, notes });
    await application.save();

    res.json({ success: true, followUps: application.followUps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/applications/:id/interview ──────────────────────────────────────
exports.addInterview = async (req, res) => {
  try {
    const { scheduledAt, type, interviewers, notes } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: "Not found" });

    application.interviews.push({ scheduledAt, type, interviewers, notes });
    application.status = "interviewing";
    await application.save();

    res.json({ success: true, interviews: application.interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/applications/:id/cover-letter ──────────────────────────────────
exports.updateCoverLetter = async (req, res) => {
  try {
    const { content } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { "coverLetter.content": content, "coverLetter.customized": true },
      { new: true }
    );
    res.json({ success: true, coverLetter: application.coverLetter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/applications/:id ──────────────────────────────────────────────
exports.deleteApplication = async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Application deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/applications/stats ────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const { resumeId } = req.query;
    const filter = resumeId ? { resumeId } : {};

    const stats = await Application.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const total = await Application.countDocuments(filter);
    const statusMap = {};
    stats.forEach((s) => (statusMap[s._id] = s.count));

    res.json({
      success: true,
      stats: {
        total,
        draft: statusMap.draft || 0,
        applied: statusMap.applied || 0,
        interviewing: statusMap.interviewing || 0,
        offer: statusMap.offer || 0,
        rejected: statusMap.rejected || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
