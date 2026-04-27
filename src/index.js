const express = require("express");
const app = express();
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Quiz API",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      profile: "GET /api/auth/profile",
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
  res.status(404).json({ msg: "Not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`✅ Quiz API server is running on http://localhost:${PORT}`);
  console.log(`📚 Test it at: http://localhost:${PORT}/api/questions`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});