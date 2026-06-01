// JWT/JWKS verification for courseService. No "own data" restriction
// needed here — RBAC alone is enough.

const jwt = require("jsonwebtoken");
const axios = require("axios");
const jwkToPem = require("jwk-to-pem");

const { AUTH_SERVICE_JWKS } = require("../../../consts");

const TRUSTED_JKU_PREFIXES = [AUTH_SERVICE_JWKS.replace("/.well-known/jwks.json", "")];

const JWKS_CACHE_MS = 5 * 60 * 1000;
const jwksCache = new Map();

async function fetchJWKS(jku) {
  const cached = jwksCache.get(jku);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;
  const response = await axios.get(jku, { timeout: 4000 });
  const keys = response.data.keys || [];
  jwksCache.set(jku, { keys, expiresAt: Date.now() + JWKS_CACHE_MS });
  return keys;
}

function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid);
  if (!key) throw new Error("no signing key matches the token's kid");
  return jwkToPem(key);
}

async function verifyJWTWithJWKS(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header) throw new Error("malformed token");
  const { kid, jku } = decoded.header;
  if (!kid || !jku) throw new Error("token missing kid or jku");
  if (!TRUSTED_JKU_PREFIXES.some((p) => jku.startsWith(p))) {
    throw new Error("untrusted JWKS URL");
  }
  const keys = await fetchJWKS(jku);
  const pem = getPublicKeyFromJWKS(kid, keys);
  return jwt.verify(token, pem, { algorithms: ["RS256"] });
}

function verifyRole(allowedRoles) {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing bearer token" });
    }
    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = await verifyJWTWithJWKS(token);
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: "forbidden: insufficient role" });
      }
      req.user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "invalid or expired token" });
    }
  };
}

module.exports = { verifyJWTWithJWKS, verifyRole };
