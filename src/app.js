import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import achievementRoutes from "./routes/achievement.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import erpRoutes from "./routes/erp.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// parse JSON bodies
app.use(express.json());
// allow form-data (multer handles files)
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("dev"));

// Serve uploaded files statically
// In production (Vercel), serve from /tmp/uploads
// In development, serve from local uploads directory
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const uploadsPath = isProduction ? '/tmp/uploads' : path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

app.use("/api/auth", authRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/erp", erpRoutes);
app.use("/api/announcements", announcementRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

// error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

export default app;
