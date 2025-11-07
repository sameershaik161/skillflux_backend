import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

// For Vercel serverless, we don't call listen()
// Instead, we export the app
if (process.env.VERCEL !== '1') {
  // Local development
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("DB connection failed:", err);
      process.exit(1);
    });
} else {
  // Vercel production - connect to DB but don't listen
  connectDB().catch((err) => {
    console.error("DB connection failed:", err);
  });
}

// Export for Vercel
export default app;
