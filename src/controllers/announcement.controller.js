import Announcement from "../models/Announcement.js";

// Admin: Create announcement
export async function createAnnouncement(req, res) {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      postedBy: req.admin._id
    });
    
    res.status(201).json({ 
      message: "Announcement created successfully", 
      announcement 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Get all announcements
export async function getAllAnnouncementsAdmin(req, res) {
  try {
    const { type, isActive } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === "true";
    
    const announcements = await Announcement.find(query)
      .populate("postedBy", "username")
      .sort({ isPinned: -1, createdAt: -1 });
    
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Update announcement
export async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true }
    );
    
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    
    res.json({ message: "Announcement updated", announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Delete announcement
export async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Student: Get active announcements
export async function getActiveAnnouncements(req, res) {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    
    if (type) query.type = type;
    
    // Filter by student's year if targetYear is set
    const announcements = await Announcement.find(query)
      .populate("postedBy", "username")
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(50);
    
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Student: Increment view count
export async function incrementViewCount(req, res) {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    res.json({ message: "View counted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get announcement stats
export async function getAnnouncementStats(req, res) {
  try {
    const totalAnnouncements = await Announcement.countDocuments();
    const activeAnnouncements = await Announcement.countDocuments({ isActive: true });
    const academicCount = await Announcement.countDocuments({ type: "academic", isActive: true });
    const careerCount = await Announcement.countDocuments({ type: "career_opportunity", isActive: true });
    
    res.json({
      total: totalAnnouncements,
      active: activeAnnouncements,
      academic: academicCount,
      career: careerCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
