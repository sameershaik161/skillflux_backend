import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function register(req, res) {
  try {
    const { name, email, rollNumber, password, department, section, year } = req.body;
    
    // Check for missing fields
    if (!name || !email || !rollNumber || !password || !department || !section || !year) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    
    // Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { rollNumber }] });
    if (existing) {
      if (existing.email === email) {
        return res.status(400).json({ message: "Email already registered" });
      } else {
        return res.status(400).json({ message: "Roll number already registered" });
      }
    }
    
    // Hash password and create user
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, rollNumber, passwordHash: hash, department, section, year });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, department: user.department, section: user.section } });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    // allow login with email or rollNumber (client sends email field)
    const { email, password } = req.body;
    console.log("Login attempt:", { email, passwordProvided: !!password });
    
    if (!email || !password) return res.status(400).json({ message: "Missing credentials" });
    
    const user = await User.findOne({ $or: [{ email }, { rollNumber: email }] });
    console.log("User found:", user ? `Yes - ${user.email}` : "No");
    
    if (!user) {
      console.log("User not found with email or rollNumber:", email);
      return res.status(400).json({ message: "Invalid credentials - User not found" });
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("Password match:", ok);
    
    if (!ok) {
      console.log("Password mismatch for user:", user.email);
      return res.status(400).json({ message: "Invalid credentials - Wrong password" });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
    console.log("Login successful for:", user.email);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, section: user.section, role: "student" } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Calculate user's rank
    const rank = await User.countDocuments({ totalPoints: { $gt: user.totalPoints } }) + 1;
    
    res.json({ ...user.toObject(), rank });
  } catch (err) {
    console.error("Me route error:", err);
    res.status(500).json({ message: err.message });
  }
}

export async function getLeaderboard(req, res) {
  try {
    const { year, department } = req.query;
    
    // Build filter query
    const filter = {};
    if (year) filter.year = year;
    if (department) filter.department = department;
    
    // Get filtered students sorted by points
    const leaderboard = await User.find(filter)
      .select("name rollNumber department section year totalPoints profilePicUrl")
      .sort({ totalPoints: -1, name: 1 })
      .limit(100); // Top 100 students
    
    // Add rank to each student and ensure totalPoints defaults to 0
    const leaderboardWithRank = leaderboard.map((student, index) => ({
      ...student.toObject(),
      totalPoints: student.totalPoints || 0,
      rank: index + 1
    }));
    
    res.json(leaderboardWithRank);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: err.message });
  }
}

export async function getMyRank(req, res) {
  try {
    const { year, department } = req.query;
    const user = await User.findById(req.userId).select("name rollNumber totalPoints year department");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const userPoints = user.totalPoints || 0;
    
    // Build filter query for rank calculation
    const filter = { totalPoints: { $gt: userPoints } };
    if (year) filter.year = year;
    if (department) filter.department = department;
    
    // Calculate rank - count how many students have MORE points in the filtered set
    const rank = await User.countDocuments(filter) + 1;
    
    // Count total students in filtered set
    const countFilter = {};
    if (year) countFilter.year = year;
    if (department) countFilter.department = department;
    const totalStudents = await User.countDocuments(countFilter);
    
    const percentile = totalStudents > 0 ? Math.round(((totalStudents - rank + 1) / totalStudents) * 100) : 0;
    
    res.json({
      rank,
      totalStudents,
      percentile,
      totalPoints: userPoints,
      name: user.name,
      rollNumber: user.rollNumber,
      year: user.year,
      department: user.department
    });
  } catch (err) {
    console.error("Rank calculation error:", err);
    res.status(500).json({ message: err.message });
  }
}

export async function uploadProfilePic(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    // Store the file path relative to server
    const fileUrl = `/uploads/${req.file.filename}`;
    req.user.profilePicUrl = fileUrl;
    await req.user.save();
    res.json({ message: "Profile picture uploaded", url: fileUrl, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function uploadBanner(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    // Store the file path relative to server
    const fileUrl = `/uploads/${req.file.filename}`;
    req.user.bannerUrl = fileUrl;
    await req.user.save();
    res.json({ message: "Banner uploaded", url: fileUrl, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function uploadResume(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    // Store the file path relative to server
    const fileUrl = `/uploads/${req.file.filename}`;
    req.user.resumeUrl = fileUrl;
    await req.user.save();
    res.json({ message: "Resume uploaded", url: fileUrl, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
