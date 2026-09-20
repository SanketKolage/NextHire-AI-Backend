const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  searchJobs,
  getJobs,
  getJob,
  scoreJob,
  toggleSave,
  hideJob,
} = require("../controllers/jobController");

router.use(authMiddleware);
router.post("/search", searchJobs);
router.get("/", getJobs);
router.get("/:id", getJob);
router.post("/:id/score", scoreJob);
router.patch("/:id/save", toggleSave);
router.patch("/:id/hide", hideJob);

module.exports = router;
