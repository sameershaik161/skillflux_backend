import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Achievement from "../models/Achievement.js";
import User from "../models/User.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing" });
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid" });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid" });
    const token = jwt.sign({ id: admin._id }, process.env.ADMIN_JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, admin: { id: admin._id, username: admin.username } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function listAchievements(req, res) {
  try {
    const { status, category } = req.query;
    const q = {};
    if (status) q.status = status;
    if (category) q.category = category;
    const items = await Achievement.find(q).populate("student", "name rollNumber section totalPoints").sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function verifyAchievement(req, res) {
  try {
    const { id } = req.params;
    const { action, points = 0, adminNote = "" } = req.body;
    const ach = await Achievement.findById(id);
    if (!ach) return res.status(404).json({ message: "Not found" });

    if (action === "approve") {
      if (ach.status !== "approved") {
        ach.status = "approved";
        ach.points = Number(points || 0);
        ach.adminNote = adminNote;
        await ach.save();
        // increment user points
        const user = await User.findById(ach.student);
        user.totalPoints = (user.totalPoints || 0) + Number(points || 0);
        await user.save();
        return res.json({ message: "Approved", achievement: ach, totalPoints: user.totalPoints });
      } else {
        return res.status(400).json({ message: "Already approved" });
      }
    } else if (action === "reject") {
      ach.status = "rejected";
      ach.adminNote = adminNote;
      await ach.save();
      return res.json({ message: "Rejected", achievement: ach });
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function toggleHighlight(req, res) {
  try {
    const ach = await Achievement.findById(req.params.id);
    if (!ach) return res.status(404).json({ message: "Not found" });
    ach.highlighted = !ach.highlighted;
    await ach.save();
    res.json({ message: "Toggled", highlighted: ach.highlighted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function adminDeleteAchievement(req, res) {
  try {
    const ach = await Achievement.findById(req.params.id);
    if (!ach) return res.status(404).json({ message: "Not found" });
    await Achievement.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(ach.student, { $pull: { achievements: req.params.id } });
    res.json({ message: "Deleted by admin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function manualAdjustPoints(req, res) {
  try {
    const { studentId } = req.params;
    const { delta = 0 } = req.body;
    const user = await User.findById(studentId);
    if (!user) return res.status(404).json({ message: "Student not found" });
    user.totalPoints = Math.max(0, (user.totalPoints || 0) + Number(delta));
    await user.save();
    res.json({ message: "Adjusted", totalPoints: user.totalPoints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function analytics(req, res) {
  try {
    const top = await User.find().sort({ totalPoints: -1 }).limit(10).select("name rollNumber section totalPoints");
    const pending = await Achievement.countDocuments({ status: "pending" });
    const approved = await Achievement.countDocuments({ status: "approved" });
    const rejected = await Achievement.countDocuments({ status: "rejected" });
    res.json({ topStudents: top, counts: { pending, approved, rejected } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get all students with their details
export async function getAllStudents(req, res) {
  try {
    console.log("📋 getAllStudents endpoint hit!");
    console.log("Admin:", req.admin?.username);
    
    const students = await User.find()
      .select("name email rollNumber department section year totalPoints profilePicUrl achievements")
      .populate("achievements")
      .sort({ department: 1, section: 1, rollNumber: 1 });
    
    console.log(`✅ Found ${students.length} students`);
    
    res.json({ students, total: students.length });
  } catch (err) {
    console.error("❌ Get all students error:", err);
    res.status(500).json({ message: err.message });
  }
}

// Get single student with full details
export async function getStudentById(req, res) {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId)
      .select("name email rollNumber department section year totalPoints profilePicUrl resumeUrl socialLinks achievements")
      .populate({
        path: "achievements",
        select: "title description category level status points certificateUrl createdAt"
      });
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    res.json({ student });
  } catch (err) {
    console.error("Get student by ID error:", err);
    res.status(500).json({ message: err.message });
  }
}

// Dashboard statistics endpoint
export async function getDashboardStats(req, res) {
  try {
    // Get all user statistics
    const totalStudents = await User.countDocuments();
    const totalAchievements = await Achievement.countDocuments();
    const pendingApprovals = await Achievement.countDocuments({ status: "pending" });
    
    // Calculate total points from all users
    const usersWithPoints = await User.aggregate([
      { $group: { _id: null, totalPoints: { $sum: "$totalPoints" } } }
    ]);
    const totalPoints = usersWithPoints[0]?.totalPoints || 0;
    
    // Get approval statistics
    const approved = await Achievement.countDocuments({ status: "approved" });
    const approvalRate = totalAchievements > 0 ? ((approved / totalAchievements) * 100).toFixed(1) : 0;
    
    // Get monthly growth (new users this month)
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thisMonthStart } });
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const newUsersLastMonth = await User.countDocuments({ 
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } 
    });
    const monthlyGrowth = newUsersLastMonth > 0 ? 
      (((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1) : 
      newUsersThisMonth * 100;
    
    // Get ERP statistics
    const ERP = (await import("../models/ERP.js")).default;
    const pendingERPs = await ERP.countDocuments({ status: "submitted" });
    
    // Get announcements statistics  
    const Announcement = (await import("../models/Announcement.js")).default;
    const activeAnnouncements = await Announcement.countDocuments({ isActive: true });
    
    // Get recent activities
    const recentAchievements = await Achievement.find()
      .populate("student", "name")
      .sort({ createdAt: -1 })
      .limit(10);
    
    const recentActivities = [];
    for (const achievement of recentAchievements) {
      const timeAgo = getTimeAgo(achievement.createdAt);
      recentActivities.push({
        text: `New achievement submitted by ${achievement.student?.name || "Unknown"}`,
        time: timeAgo,
        type: achievement.status === "approved" ? "success" : 
              achievement.status === "rejected" ? "error" : "achievement"
      });
    }
    
    res.json({
      stats: {
        totalStudents,
        totalAchievements,
        pendingApprovals,
        totalPoints,
        approvalRate: parseFloat(approvalRate),
        monthlyGrowth: parseFloat(monthlyGrowth),
        pendingERPs,
        activeAnnouncements
      },
      recentActivities
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: err.message });
  }
}

// Helper function to get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return count === 1 ? `1 ${interval.label} ago` : `${count} ${interval.label}s ago`;
    }
  }
  return 'just now';
}

// AI-powered certificate analysis using Google Gemini
export async function analyzeCertificate(req, res) {
  try {
    console.log("AI Analysis Request:", req.body);
    const { title, description, category, level } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ message: "Title and category are required" });
    }
    
    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your-gemini-api-key-here") {
      // Use Google Gemini for analysis
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
          Analyze this student achievement certificate and provide a detailed assessment:
          
          Certificate Title: ${title}
          Description: ${description || "No description provided"}
          Category: ${category}
          Level: ${level || "Not specified"}
          
          Please provide:
          1. A brief summary of the achievement (2-3 sentences)
          2. Credibility score (0-100) based on the organization, complexity, and value
          3. Key factors that influenced the credibility score
          4. Recommended points to award (0-100)
          5. Key highlights or skills demonstrated
          6. Any red flags or concerns
          
          Format your response as a JSON object with these fields:
          summary, credibility_score, credibility_factors (array), recommended_points, 
          key_highlights (array), skills_identified (array), red_flags (array), 
          assessment_level (Excellent/Good/Fair/Needs Review), ai_confidence (High/Medium/Low)
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the Gemini response
        try {
          // Extract JSON from the response (Gemini might include extra text)
          const jsonMatch = text.match(/\{[^]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            console.log("Gemini AI Analysis Result:", analysis);
            return res.json({ ...analysis, powered_by: "Google Gemini AI" });
          }
        } catch (parseErr) {
          console.error("Failed to parse Gemini response:", parseErr);
          // Fall back to pattern-based analysis
        }
      } catch (geminiErr) {
        console.error("Gemini API Error:", geminiErr);
        // Fall back to pattern-based analysis
      }
    }
    
    // Fallback to pattern-based analysis if Gemini is not available
    const analysis = generateCertificateAnalysis(title, description, category, level);
    console.log("Pattern-based Analysis Result:", analysis);
    res.json({ ...analysis, powered_by: "Pattern-based Analysis" });
    
  } catch (err) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ message: err.message || "Analysis failed" });
  }
}

// Helper function for AI analysis (Pattern-based intelligent analysis)
function generateCertificateAnalysis(title = "", description = "", category = "", level = "") {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  // Determine credibility score
  let credibilityScore = 50; // Base score
  let credibilityFactors = [];
  
  // High-value keywords
  const prestigiousOrgs = ['google', 'microsoft', 'amazon', 'aws', 'ieee', 'ibm', 'oracle', 'coursera', 'udacity', 'stanford', 'mit', 'harvard'];
  const technicalKeywords = ['machine learning', 'ai', 'cloud', 'blockchain', 'data science', 'cybersecurity', 'devops', 'full stack'];
  const competitionKeywords = ['hackathon', 'winner', 'finalist', 'champion', 'award', '1st place', 'first prize'];
  
  // Check for prestigious organizations
  if (prestigiousOrgs.some(org => titleLower.includes(org) || descLower.includes(org))) {
    credibilityScore += 30;
    credibilityFactors.push('Issued by recognized organization');
  }
  
  // Check for technical depth
  if (technicalKeywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
    credibilityScore += 15;
    credibilityFactors.push('Technical skill certification');
  }
  
  // Check for competition achievement
  if (competitionKeywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
    credibilityScore += 20;
    credibilityFactors.push('Competition/Award achievement');
  }
  
  // Level-based scoring
  if (level === 'international') credibilityScore += 20;
  else if (level === 'national') credibilityScore += 15;
  else if (level === 'state') credibilityScore += 10;
  
  // Cap score at 100
  credibilityScore = Math.min(100, credibilityScore);
  
  // Generate summary
  let summary = '';
  let category_assessment = '';
  let recommended_points = 0;
  let key_highlights = [];
  
  // Category-specific assessment
  switch (category) {
    case 'certification':
      category_assessment = 'Professional certification demonstrating skill validation';
      recommended_points = Math.floor(credibilityScore * 0.5); // 0-50 points
      if (titleLower.includes('advanced') || titleLower.includes('professional')) {
        key_highlights.push('Advanced level certification');
        recommended_points += 10;
      }
      break;
    case 'competition':
      category_assessment = 'Competitive achievement showing excellence';
      recommended_points = Math.floor(credibilityScore * 0.7); // 0-70 points
      if (titleLower.includes('1st') || titleLower.includes('winner') || titleLower.includes('champion')) {
        key_highlights.push('Top position achieved');
        recommended_points += 20;
      }
      break;
    case 'project':
      category_assessment = 'Technical project demonstrating practical skills';
      recommended_points = Math.floor(credibilityScore * 0.4); // 0-40 points
      if (descLower.includes('deployed') || descLower.includes('live') || descLower.includes('production')) {
        key_highlights.push('Production-ready implementation');
        recommended_points += 15;
      }
      break;
    case 'internship':
      category_assessment = 'Professional work experience';
      recommended_points = Math.floor(credibilityScore * 0.6); // 0-60 points
      if (descLower.includes('ppo') || descLower.includes('full-time offer')) {
        key_highlights.push('Received full-time offer');
        recommended_points += 25;
      }
      break;
    default:
      category_assessment = 'General achievement';
      recommended_points = Math.floor(credibilityScore * 0.3);
  }
  
  // Generate detailed summary
  if (credibilityScore >= 80) {
    summary = `Highly credible ${category} with exceptional value. This achievement demonstrates significant accomplishment and should be weighted heavily in evaluation.`;
  } else if (credibilityScore >= 60) {
    summary = `Solid ${category} with good credibility. This represents meaningful achievement and validates student's capabilities in the domain.`;
  } else if (credibilityScore >= 40) {
    summary = `Moderate ${category} with acceptable credibility. This shows student initiative and learning, though may need verification of details.`;
  } else {
    summary = `Basic ${category} achievement. While showing student engagement, this may have limited industry recognition. Verify authenticity and scope.`;
  }
  
  // Extract skills mentioned
  const skills = [];
  const skillPatterns = ['python', 'java', 'javascript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'ml', 'ai', 'data'];
  skillPatterns.forEach(skill => {
    if (titleLower.includes(skill) || descLower.includes(skill)) {
      skills.push(skill.toUpperCase());
    }
  });
  
  // Identify potential red flags
  const red_flags = [];
  if (description && description.length < 20) {
    red_flags.push('Very brief description - request more details');
  }
  if (!description || description.length === 0) {
    red_flags.push('No description provided');
  }
  if (!title || title.length < 5) {
    red_flags.push('Incomplete title information');
  }
  
  return {
    summary,
    credibility_score: credibilityScore,
    credibility_factors: credibilityFactors,
    category_assessment: category_assessment,
    recommended_points: recommended_points,
    key_highlights: key_highlights,
    skills_identified: skills,
    red_flags: red_flags,
    assessment_level: credibilityScore >= 80 ? 'Excellent' : credibilityScore >= 60 ? 'Good' : credibilityScore >= 40 ? 'Fair' : 'Needs Review',
    ai_confidence: credibilityScore >= 70 ? 'High' : credibilityScore >= 50 ? 'Medium' : 'Low'
  };
}
