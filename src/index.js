const app = require("./app");
const logger = require("./lib/logger");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "server listening");
  logger.info({ url: `http://localhost:${PORT}/uploads/` }, "Uploaded images available at");
  logger.info({ url: `http://localhost:${PORT}/` }, "Frontend available at");
});

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    logger.info("Prisma disconnected");
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);