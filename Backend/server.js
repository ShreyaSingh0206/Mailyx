
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";

dotenv.config();

const app = express();

// Trust Render's proxy
app.set("trust proxy", 1);

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

// Database connection
connectDB();

// Middlewares
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mailyx backend is running!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/clients", clientRoutes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
