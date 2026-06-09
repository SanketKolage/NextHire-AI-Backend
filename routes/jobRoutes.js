const express = require("express");
const router = express.Router();
const {
  searchJobs,
  getJobs,
  getJob,
  scoreJob,
  toggleSave,
  hideJob,
} = require("../controllers/jobController");

router.post("/search", searchJobs);
router.get("/", getJobs);
router.get("/:id", getJob);
router.post("/:id/score", scoreJob);
router.patch("/:id/save", toggleSave);
router.patch("/:id/hide", hideJob);

module.exports = router;
