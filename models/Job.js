const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    // Source data
    externalId: { type: String }, // from job search API
    source: { type: String, default: "jsearch" },

    // Job details
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    isRemote: { type: Boolean, default: false },
    jobType: { type: String }, // Full-time, Part-time, Contract
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    salaryCurrency: { type: String, default: "USD" },
    description: { type: String },
    requirements: [String],
    responsibilities: [String],
    benefits: [String],
    applyUrl: { type: String },
    companyLogo: { type: String },
    companyWebsite: { type: String },
    postedAt: { type: Date },
    deadline: { type: Date },

    // AI Match scoring (linked to a resume)
    aiMatch: {
      resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume" },
      score: { type: Number, min: 0, max: 100 },
      strengths: [String],
      gaps: [String],
      recommendation: String,
      scoredAt: Date,
    },

    // Status
    isSaved: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for faster queries
JobSchema.index({ title: "text", company: "text", description: "text" });
JobSchema.index({ "aiMatch.score": -1 });

module.exports = mongoose.model("Job", JobSchema);
