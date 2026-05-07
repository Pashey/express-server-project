const express = require("express");
const path = require("path");  // ← ADD THIS LINE
const app = express();
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));


app.use(express.static(path.join(__dirname, "..", "public"))); 


app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);


app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Quiz API",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      profile: "GET /api/auth/profile",
      getAllQuestions: "GET /api/questions",
      getQuestionById: "GET /api/questions/:id",
      createQuestion: "POST /api/questions (multipart/form-data for images)",
      updateQuestion: "PUT /api/questions/:id",
      deleteQuestion: "DELETE /api/questions/:id",
      searchByKeyword: "GET /api/questions?keyword=finland",
      allKeywords: "GET /api/questions/keywords/all",
      likeQuestion: "POST /api/questions/:id/like",
      unlikeQuestion: "DELETE /api/questions/:id/like",
    },
  });
});


app.use((req, res) => {
  res.status(404).json({ msg: "Not found" });
});


app.use((err, req, res, next) => {
  console.error("Error:", err);
  
  if (err.message === "Only image files are allowed") {
    return res.status(400).json({ message: err.message });
  }
  
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large. Maximum size is 5MB" });
  }
  
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});


const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🖼️  Uploaded images available at: http://localhost:${PORT}/uploads/`);
  console.log(`🌐 Frontend available at: http://localhost:${PORT}/`);
});


process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("✅ Prisma disconnected");
    console.log("👋 Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("✅ Prisma disconnected");
    console.log("👋 Server closed");
    process.exit(0);
  });
});

module.exports = app;