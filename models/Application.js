const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // Application details
    status: {
      type: String,
      enum: [
        "draft",
        "ready",
        "applied",
        "viewed",
        "interviewing",
        "offer",
        "rejected",
        "withdrawn",
      ],
      default: "draft",
    },

    // AI-generated cover letter
    coverLetter: {
      content: String,
      generatedAt: Date,
      customized: Boolean,
    },

    // AI-optimized resume tailoring notes
    resumeTailoring: {
      suggestions: [String],
      keywordsToAdd: [String],
      generatedAt: Date,
    },

    // Application method
    appliedVia: {
      type: String,
      enum: ["email", "portal", "linkedin", "manual", "auto"],
    },
    appliedAt: Date,
    applicationUrl: String,

    // Follow-up tracking
    followUps: [
      {
        date: Date,
        type: { type: String, enum: ["email", "linkedin", "phone", "other"] },
        notes: String,
      },
    ],

    // Interview tracking
    interviews: [
      {
        scheduledAt: Date,
        type: { type: String, enum: ["phone", "video", "onsite", "technical"] },
        interviewers: [String],
        notes: String,
        outcome: String,
      },
    ],

    notes: String,
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", ApplicationSchema);
