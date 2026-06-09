const express = require("express");
const router = express.Router();
const {
  createApplication,
  getApplications,
  getApplication,
  updateStatus,
  generateCoverLetter,
  generateTailoring,
  sendEmail,
  addFollowUp,
  addInterview,
  updateCoverLetter,
  deleteApplication,
  getStats,
} = require("../controllers/applicationController");

router.get("/stats", getStats);
router.post("/", createApplication);
router.get("/", getApplications);
router.get("/:id", getApplication);
router.patch("/:id/status", updateStatus);
router.post("/:id/cover-letter", generateCoverLetter);
router.patch("/:id/cover-letter", updateCoverLetter);
router.post("/:id/tailoring", generateTailoring);
router.post("/:id/send-email", sendEmail);
router.post("/:id/follow-up", addFollowUp);
router.post("/:id/interview", addInterview);
router.delete("/:id", deleteApplication);

module.exports = router;
