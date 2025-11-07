import Achievement from "../models/Achievement.js";
import User from "../models/User.js";

export async function addAchievement(req, res) {
  try {
    const { title, description, category, date, level } = req.body;
    if (!title || !category || !date) return res.status(400).json({ message: "Missing fields" });

    // Map files to local paths instead of S3 URLs
    const proofFiles = (req.files || []).map(f => `/uploads/${f.filename}`);
    const links = { leetcode: req.body.leetcode || "", linkedin: req.body.linkedin || "", codechef: req.body.codechef || "" };

    const ach = await Achievement.create({
      student: req.user._id,
      title,
      description,
      category,
      date,
      level,
      proofFiles,
      links
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { achievements: ach._id } });
    res.status(201).json({ message: "Achievement submitted successfully", achievement: ach });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function myAchievements(req, res) {
  try {
    const items = await Achievement.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getAchievement(req, res) {
  try {
    const a = await Achievement.findById(req.params.id).populate("student", "name rollNumber section");
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteAchievement(req, res) {
  try {
    const ach = await Achievement.findById(req.params.id);
    if (!ach) return res.status(404).json({ message: "Not found" });
    if (!ach.student.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });
    await Achievement.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.user._id, { $pull: { achievements: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
