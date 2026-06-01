// Correlation IDs let us trace a single request as it bounces between
// several microservices. The first service that sees a request either
// reuses an incoming x-correlation-id header or invents a new one, then
// every log line and outgoing service-to-service call carries the same id.

const { v4: uuidv4 } = require("uuid");
const cls = require("cls-hooked");

// cls-hooked gives us "request-scoped" storage that survives async hops.
// Without it, we would have to thread the id through every function call by hand.
const namespace = cls.createNamespace("sms-app-namespace");

// Express middleware: drops the id into the namespace for the duration of the
// request and echoes it back in the response so callers can see it too.
const correlationIdMiddleware = (req, res, next) => {
  namespace.run(() => {
    const correlationId = req.headers["x-correlation-id"] || uuidv4();
    namespace.set("correlationId", correlationId);
    res.setHeader("x-correlation-id", correlationId);
    next();
  });
};

// Anywhere inside the request lifecycle we can grab the id (e.g. from inside a logger
// formatter or before calling axios on another service).
const getCorrelationId = () => namespace.get("correlationId") || "N/A";

module.exports = { correlationIdMiddleware, getCorrelationId };
