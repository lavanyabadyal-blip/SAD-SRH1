// JWKS endpoint — exposes our RSA public key in JWK format so other
// services can verify JWTs without us shipping the key file around.
// The route is mounted at /.well-known/jwks.json.

const express = require("express");
const crypto = require("crypto");

const { KID, publicKey } = require("./util");

const router = express.Router();

// Convert the PEM-encoded public key into a JWK object using Node's
// built-in crypto. This is much safer than hand-parsing the PEM text.
const jwk = crypto.createPublicKey(publicKey).export({ format: "jwk" });

router.get("/", (_req, res) => {
  res.json({
    keys: [
      {
        ...jwk,
        kid: KID,
        use: "sig",
        alg: "RS256",
      },
    ],
  });
});

module.exports = router;
