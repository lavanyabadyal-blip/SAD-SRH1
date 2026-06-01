// Centralised logger. Each service imports its own named logger so log
// lines show which service produced them. We log to the console as JSON
// so the lines are easy to grep and to ingest into something like
// Elasticsearch later if needed.

const { createLogger, format, transports } = require("winston");
const { getCorrelationId } = require("./correlationId");

// Standard severity levels. "fatal" goes above error for crash-level events.
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

// Build a logger for a specific service so the log line carries appName.
const createDynamicLogger = (appName) => {
  return createLogger({
    levels,
    level: "info",
    format: format.combine(
      format.timestamp(),
      format.printf(({ level, message, timestamp }) =>
        JSON.stringify({
          timestamp,
          level,
          appName,
          correlationId: getCorrelationId(),
          message,
        })
      )
    ),
    transports: [new transports.Console()],
  });
};

// Pre-built loggers — one per service. Importing the right one keeps the
// appName field accurate without each service having to remember its own name.
const authServiceLogger = createDynamicLogger("authService");
const studentServiceLogger = createDynamicLogger("studentService");
const professorServiceLogger = createDynamicLogger("professorService");
const courseServiceLogger = createDynamicLogger("courseService");
const enrollmentServiceLogger = createDynamicLogger("enrollmentService");

module.exports = {
  authServiceLogger,
  studentServiceLogger,
  professorServiceLogger,
  courseServiceLogger,
  enrollmentServiceLogger,
};
