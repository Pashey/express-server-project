const express = require("express");
const app = express();
const questionsRouter = require("./routes/questions");  // Changed from posts to questions
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/questions", questionsRouter);  // Changed from /api/posts to /api/questions

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Quiz API",
    endpoints: {
      getAllQuestions: "GET /api/questions",
      getQuestionById: "GET /api/questions/:id",
      createQuestion: "POST /api/questions",
      updateQuestion: "PUT /api/questions/:id",
      deleteQuestion: "DELETE /api/questions/:id",
      searchByKeyword: "GET /api/questions?keyword=finland",
      allKeywords: "GET /api/questions/keywords/all"
    }
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Quiz API server is running on http://localhost:${PORT}`);
  console.log(`📚 Test it at: http://localhost:${PORT}/api/questions`);
});

// Graceful shutdown (clean up Prisma connection)
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT signal. Shutting down gracefully...");
  await prisma.$disconnect();
  console.log("✅ Prisma disconnected");
  server.close(() => {
    console.log("👋 Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM signal. Shutting down gracefully...");
  await prisma.$disconnect();
  console.log("✅ Prisma disconnected");
  server.close(() => {
    console.log("👋 Server closed");
    process.exit(0);
  });
});