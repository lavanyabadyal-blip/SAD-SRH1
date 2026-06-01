// Course service entry point.

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const connectDB = require("./config/db");
const courseRoute = require("./routes/courseRoute");
const { courseServiceLogger } = require("../logging");
const { correlationIdMiddleware } = require("../correlationId");

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);

app.use("/api/courses", courseRoute);

(async function start() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5004;
    app.listen(PORT, () => {
      courseServiceLogger.info(`Course service running on port ${PORT}`);
    });
  } catch (err) {
    courseServiceLogger.error(`course service startup failed: ${err.message}`);
    process.exit(1);
  }
})();
