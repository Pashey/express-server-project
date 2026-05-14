const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { ValidationError, ConflictError, UnauthorizedError } = require("../lib/errors");

const SECRET = process.env.JWT_SECRET;

// POST /api/auth/register - Register a new user
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new ValidationError("email, password and name are required");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "7d" });

    req.log.info({ email }, "User registered successfully");

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    req.log.warn({ error: error.message }, "Registration failed");
    next(error);
  }
});

// POST /api/auth/login - Login user
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError("email and password are required");
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "7d" });

    req.log.info({ email }, "User logged in successfully");

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    req.log.warn({ error: error.message }, "Login failed");
    next(error);
  }
});

// GET /api/auth/profile - Get user profile (protected)
router.get("/profile", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    req.log.info({ userId: user.id }, "Profile accessed");
    res.json({ user });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      req.log.warn({ error: error.message }, "Token validation failed");
      return next(new UnauthorizedError("Invalid or expired token"));
    }
    next(error);
  }
});

module.exports = router;