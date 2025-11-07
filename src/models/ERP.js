import mongoose from "mongoose";

// Schema for individual course in a semester
const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  courseCode: String,
  credits: Number,
  grade: String,
  gpa: { type: Number, min: 0, max: 10 }
}, { _id: false });

// Schema for semester details
const semesterSchema = new mongoose.Schema({
  semesterName: { type: String, required: true }, // e.g., "1-1", "1-2", "2-1"
  year: { type: Number, required: true }, // 1, 2, 3, 4
  semesterNumber: { type: Number, required: true }, // 1 or 2
  courses: [courseSchema],
  sgpa: { type: Number, min: 0, max: 10 }, // Semester GPA
  totalCredits: Number
}, { _id: false });

// Schema for projects
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  technologies: [String],
  duration: String,
  role: String,
  link: String,
  certificateUrl: String
}, { _id: false });

// Schema for internships
const internshipSchema = new mongoose.Schema({
  company: { type: String, required: true },
  role: String,
  duration: String,
  startDate: Date,
  endDate: Date,
  stipend: String,
  description: String,
  certificateUrl: String
}, { _id: false });

// Schema for placements
const placementSchema = new mongoose.Schema({
  company: { type: String, required: true },
  package: String,
  role: String,
  offerDate: Date,
  joiningDate: Date,
  offerLetterUrl: String
}, { _id: false });

// Schema for research works
const researchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  domain: String,
  guideName: String,
  publicationStatus: String, // Published, Under Review, In Progress
  journalName: String,
  conferenceDetails: String,
  year: String,
  paperUrl: String,
  certificateUrl: String
}, { _id: false });

// Main ERP Schema
const erpSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true 
  },
  
  // Academic Details
  currentSemester: { 
    type: String, 
    required: true 
  }, // e.g., "2-1", "3-2"
  currentYear: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 4 
  },
  semesters: [semesterSchema],
  overallCGPA: { type: Number, min: 0, max: 10 },
  
  // Pre-BTech Education
  intermediatePercentage: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  intermediateBoard: String, // AP Board, CBSE, etc.
  intermediateYear: Number,
  
  sslcPercentage: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  sslcBoard: String,
  sslcYear: Number,
  
  // Personal Details
  fullName: String,
  phoneNumber: { 
    type: String, 
    required: true,
    match: /^[0-9]{10}$/
  },
  email: String,
  
  // Father Details
  fatherName: String,
  fatherPhone: String,
  fatherOccupation: String,
  
  // Mother Details
  motherName: String,
  motherPhone: String,
  motherOccupation: String,
  
  // Accommodation
  accommodationType: {
    type: String,
    enum: ["day_scholar", "residential"],
    default: "day_scholar"
  },
  whereFrom: String, // For day scholars
  residentialAddress: String, // For residential students
  
  // Scholarship Details
  scholarshipAvailed: { 
    type: Boolean, 
    default: false 
  },
  scholarshipName: String,
  scholarshipAmount: String,
  scholarshipYear: String,
  
  // Address
  permanentAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // CRT Training Details
  projects: [projectSchema],
  internships: [internshipSchema],
  placements: [placementSchema],
  researchWorks: [researchSchema],
  
  // Certifications & Skills
  certifications: [{
    name: String,
    issuedBy: String,
    issueDate: Date,
    certificateUrl: String
  }],
  
  technicalSkills: [String],
  softSkills: [String],
  
  // Extracurricular
  extracurricular: [{
    activity: String,
    role: String,
    description: String,
    year: String
  }],
  
  // Status & Verification
  status: { 
    type: String, 
    enum: ["draft", "submitted", "verified", "rejected"], 
    default: "draft" 
  },
  submittedAt: Date,
  verifiedAt: Date,
  adminNote: String,
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin" 
  },
  
  // Points awarded for ERP completeness
  erpPoints: { 
    type: Number, 
    default: 0 
  }
  
}, { timestamps: true });

// Calculate overall CGPA before saving
erpSchema.pre('save', function(next) {
  if (this.semesters && this.semesters.length > 0) {
    const totalSGPA = this.semesters.reduce((sum, sem) => sum + (sem.sgpa || 0), 0);
    this.overallCGPA = (totalSGPA / this.semesters.length).toFixed(2);
  }
  next();
});

export default mongoose.model("ERP", erpSchema);
