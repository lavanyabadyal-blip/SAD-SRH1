// Entry point for the authentication service.
// Responsibilities:
//   - expose POST /api/login/student and POST /api/login/professor for login
//   - expose GET /.well-known/jwks.json so other services can fetch the public key
//   - sign JWTs that the rest of the system trusts

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const { authServiceLogger } = require("../logging");
const { correlationIdMiddleware } = require("../correlationId");

const loginRoute = require("./routes/auth/loginRoute");
const publicKeyRoute = require("./routes/auth/publicKeyRoute");

const app = express();

// Parse JSON bodies and tag every request with a correlation id.
app.use(express.json());
app.use(correlationIdMiddleware);

// JWKS endpoint — every other service hits this to fetch the public key.
// Path follows the OIDC convention ("/.well-known/jwks.json") so generic
// libraries can find it.
app.use("/.well-known/jwks.json", publicKeyRoute);

// Login routes for the two account types we support.
app.use("/api/login", loginRoute);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  authServiceLogger.info(`Auth service running on port ${PORT}`);
});
