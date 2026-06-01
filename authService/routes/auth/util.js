// Auth-service-only helpers. The private key lives here and never leaves
// the process — other services receive only the public key via JWKS.

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const {
  STUDENT_SERVICE_INTERNAL,
  PROFESSOR_SERVICE_INTERNAL,
  ROLES,
} = require("../../../consts");

// Load the RSA key pair from disk once at startup. They were generated
// with `openssl genrsa` and live next to this file.
const KEYS_DIR = path.join(__dirname, "keys");
const privateKey = fs.readFileSync(path.join(KEYS_DIR, "private.key"), "utf8");
const publicKey = fs.readFileSync(path.join(KEYS_DIR, "public.key"), "utf8");

// Key ID — embedded in every JWT header. If we ever rotate keys we just
// bump this and publish a new entry in the JWKS, keeping old tokens valid.
const KID = "sms-key-1";

// JWKS URL we expect other services to call. They will resolve it from
// the token's "jku" header rather than hardcoding.
const JKU = `http://localhost:${process.env.PORT || 5001}/.well-known/jwks.json`;

// JWT header pieces: algorithm fixed to RS256 and kid/jku so verifiers
// know which key to fetch and how to verify.
const jwtHeader = { kid: KID, jku: JKU };

// Sign a payload with the private key. Tokens live for one hour.
function signToken(payload, expiresIn = "1h") {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn,
    header: jwtHeader,
  });
}

// Local verify is convenient inside authService itself (e.g. to test).
function verifyTokenLocally(token) {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

// authService needs to call other services on internal endpoints to read
// password hashes during login. We sign a service-identity token with the
// AUTH_SERVICE role; other services accept that role for internal routes.
// No expiry is set deliberately — this process restarts often enough.
const serviceToken = jwt.sign(
  { sub: "authService", role: ROLES.AUTH_SERVICE },
  privateKey,
  { algorithm: "RS256", header: jwtHeader }
);

const internalHeaders = { Authorization: `Bearer ${serviceToken}` };

// Pull all students (including password hashes) for the login lookup.
async function fetchStudents() {
  const response = await axios.get(STUDENT_SERVICE_INTERNAL, { headers: internalHeaders });
  return response.data;
}

// Same shape for professors.
async function fetchProfessors() {
  const response = await axios.get(PROFESSOR_SERVICE_INTERNAL, { headers: internalHeaders });
  return response.data;
}

module.exports = {
  KID,
  publicKey,
  signToken,
  verifyTokenLocally,
  fetchStudents,
  fetchProfessors,
};
