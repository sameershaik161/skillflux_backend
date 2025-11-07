import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  level: { type: String, enum: ["College", "State", "National", "International"], default: "College" },
  proofFiles: [{ type: String }], // S3 urls
  links: { leetcode: String, linkedin: String, codechef: String },
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  points: { type: Number, default: 0 },
  highlighted: { type: Boolean, default: false },
  adminNote: String
}, { timestamps: true });

export default mongoose.model("Achievement", achievementSchema);
