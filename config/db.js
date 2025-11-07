import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      ssl: true,
      sslValidate: false, // 🔥 this line disables strict TLS cert validation
      retryWrites: true,
      w: "majority",
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
