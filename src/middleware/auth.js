const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../lib/errors");

const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Return proper 401 instead of throwing
      return res.status(401).json({ message: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1];
    
    try {
      req.user = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
      next();
    } catch (err) {
      // Return proper 403 instead of throwing
      return res.status(403).json({ message: "Invalid or expired token" });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
