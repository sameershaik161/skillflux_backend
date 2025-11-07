import express from "express";
import authStudent from "../middlewares/authStudent.js";
import upload from "../middlewares/multerS3Upload.js";
import { addAchievement, myAchievements, getAchievement, deleteAchievement } from "../controllers/achievement.controller.js";

const router = express.Router();

router.post("/add", authStudent, upload.array("proofFiles", 5), addAchievement);
router.get("/me", authStudent, myAchievements);
router.get("/:id", authStudent, getAchievement);
router.delete("/:id", authStudent, deleteAchievement);

export default router;
