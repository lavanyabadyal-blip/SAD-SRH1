const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const jwkToPem = require("jwk-to-pem");
const { ROLES } = require("../../../consts");

dotenv.config();

async function fetchJWKS(jku) {}

function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid);

  if (!key) {
    throw new Error("Unable to find a signing key that matches the 'kid'");
  }

  return jwkToPem(key);
}

async function verifyJWTWithJWKS(token) {}

// Role-based Access Control Middleware
function verifyRole(requiredRoles) {}

function restrictProfessorToOwnData(req, res, next) {}

module.exports = {
  verifyRole,
  restrictProfessorToOwnData,
};
