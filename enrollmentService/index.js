// Enrollment service entry point.

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const connectDB = require("./config/db");
const enrollmentRoute = require("./routes/enrollmentRoute");
const { enrollmentServiceLogger } = require("../logging");
const { correlationIdMiddleware } = require("../correlationId");

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);

app.use("/api/enrollments", enrollmentRoute);

(async function start() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5005;
    app.listen(PORT, () => {
      enrollmentServiceLogger.info(`Enrollment service running on port ${PORT}`);
    });
  } catch (err) {
    enrollmentServiceLogger.error(`enrollment service startup failed: ${err.message}`);
    process.exit(1);
  }
})();
