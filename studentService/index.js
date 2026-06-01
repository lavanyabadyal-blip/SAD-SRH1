// Student service entry point.

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const connectDB = require("./config/db");
const studentRoute = require("./routes/studentRoute");
const { studentServiceLogger } = require("../logging");
const { correlationIdMiddleware } = require("../correlationId");

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);

app.use("/api/students", studentRoute);

// Wait for the DB before binding the port so failures are visible.
(async function start() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5003;
    app.listen(PORT, () => {
      studentServiceLogger.info(`Student service running on port ${PORT}`);
    });
  } catch (err) {
    studentServiceLogger.error(`student service startup failed: ${err.message}`);
    process.exit(1);
  }
})();
