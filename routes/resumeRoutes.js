const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  uploadResume,
  getAllResumes,
  getResume,
  deleteResume,
} = require("../controllers/resumeController");

router.post("/upload", upload.single("resume"), uploadResume);
router.get("/", getAllResumes);
router.get("/:id", getResume);
router.delete("/:id", deleteResume);

module.exports = router;
