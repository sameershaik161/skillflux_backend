import ERP from "../models/ERP.js";
import User from "../models/User.js";

// Get student's ERP profile
export async function getMyERP(req, res) {
  try {
    let erp = await ERP.findOne({ student: req.user._id });
    
    // If no ERP exists, create a draft one
    if (!erp) {
      erp = await ERP.create({
        student: req.user._id,
        currentSemester: "1-1",
        currentYear: 1,
        phoneNumber: "0000000000", // placeholder
        status: "draft"
      });
    }
    
    res.json(erp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Update ERP profile (can update partially)
export async function updateERP(req, res) {
  try {
    const erp = await ERP.findOne({ student: req.user._id });
    
    if (!erp) {
      return res.status(404).json({ message: "ERP not found" });
    }
    
    // Don't allow update if already submitted and verified
    if (erp.status === "verified") {
      return res.status(400).json({ message: "Cannot update verified ERP. Contact admin." });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'status' && key !== 'verifiedBy' && key !== 'erpPoints') {
        erp[key] = req.body[key];
      }
    });
    
    await erp.save();
    res.json({ message: "ERP updated successfully", erp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Submit ERP for verification
export async function submitERP(req, res) {
  try {
    const erp = await ERP.findOne({ student: req.user._id });
    
    if (!erp) {
      return res.status(404).json({ message: "ERP not found" });
    }
    
    // Validate required fields
    if (!erp.phoneNumber || erp.phoneNumber === "0000000000") {
      return res.status(400).json({ message: "Please provide a valid phone number" });
    }
    
    if (!erp.semesters || erp.semesters.length === 0) {
      return res.status(400).json({ message: "Please add at least one semester's academic details" });
    }
    
    erp.status = "submitted";
    erp.submittedAt = new Date();
    await erp.save();
    
    res.json({ message: "ERP submitted for verification", erp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Get all submitted ERPs
export async function getAllERPs(req, res) {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    
    const erps = await ERP.find(query)
      .populate("student", "name rollNumber email section year totalPoints")
      .populate("verifiedBy", "username")
      .sort({ submittedAt: -1 });
    
    res.json(erps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Get specific student's ERP
export async function getStudentERP(req, res) {
  try {
    const { studentId } = req.params;
    
    const erp = await ERP.findOne({ student: studentId })
      .populate("student", "name rollNumber email section year totalPoints profilePicUrl");
    
    if (!erp) {
      return res.status(404).json({ message: "ERP not found for this student" });
    }
    
    res.json(erp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Verify/Reject ERP
export async function verifyERP(req, res) {
  try {
    const { id } = req.params;
    const { action, points = 0, adminNote = "" } = req.body;
    
    const erp = await ERP.findById(id).populate("student");
    
    if (!erp) {
      return res.status(404).json({ message: "ERP not found" });
    }
    
    if (action === "verify") {
      erp.status = "verified";
      erp.verifiedAt = new Date();
      erp.verifiedBy = req.admin._id;
      erp.erpPoints = Number(points || 0);
      erp.adminNote = adminNote;
      
      await erp.save();
      
      // Award points to student
      const user = await User.findById(erp.student._id);
      user.totalPoints = (user.totalPoints || 0) + Number(points || 0);
      await user.save();
      
      return res.json({ 
        message: "ERP verified successfully", 
        erp, 
        studentPoints: user.totalPoints 
      });
      
    } else if (action === "reject") {
      erp.status = "rejected";
      erp.adminNote = adminNote;
      erp.verifiedBy = req.admin._id;
      
      await erp.save();
      
      return res.json({ message: "ERP rejected", erp });
      
    } else {
      return res.status(400).json({ message: "Invalid action. Use 'verify' or 'reject'" });
    }
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Update ERP points
export async function updateERPPoints(req, res) {
  try {
    const { id } = req.params;
    const { points } = req.body;
    
    const erp = await ERP.findById(id).populate("student");
    
    if (!erp) {
      return res.status(404).json({ message: "ERP not found" });
    }
    
    const oldPoints = erp.erpPoints || 0;
    const newPoints = Number(points || 0);
    const pointsDiff = newPoints - oldPoints;
    
    erp.erpPoints = newPoints;
    await erp.save();
    
    // Update student points
    const user = await User.findById(erp.student._id);
    user.totalPoints = (user.totalPoints || 0) + pointsDiff;
    await user.save();
    
    res.json({ 
      message: "ERP points updated", 
      erp, 
      studentPoints: user.totalPoints 
    });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
