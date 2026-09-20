const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { getProfile, updateProfile, syncProfileFromResume } = require("../controllers/profileController");

router.use(authMiddleware);
router.get("/", getProfile);
router.put("/", updateProfile);
router.post("/sync-from-resume", syncProfileFromResume);

module.exports = router;
