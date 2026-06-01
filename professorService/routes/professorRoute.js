// Routes for the professor resource. Mirrors studentService closely so
// they are easy to maintain side-by-side.

const express = require("express");

const Professor = require("../models/professor");
const {
  verifyRole,
  restrictProfessorToOwnData,
  verifyJWTWithJWKS,
} = require("./auth/util");
const { ROLES } = require("../../consts");
const { professorServiceLogger } = require("../../logging");

const router = express.Router();

// Internal: returns professors with password hashes for authService login.
router.get("/internal", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing bearer token" });
  }
  try {
    const payload = await verifyJWTWithJWKS(authHeader.slice("Bearer ".length));
    if (payload.role !== ROLES.AUTH_SERVICE) {
      return res.status(403).json({ error: "forbidden" });
    }
    const professors = await Professor.find().sort({ createdAt: -1 });
    return res.status(200).json(professors);
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
});

// Register a new professor. Admin-only — professors do not self-register
// in this system (we let an admin create the record).
router.post("/", verifyRole([ROLES.ADMIN]), async (req, res) => {
  const { name, email, phone, password } = req.body || {};

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "name, email, phone and password are required" });
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await Professor.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: "email already registered" });
    }

    const professor = await Professor.create({
      name: String(name).trim(),
      email: cleanEmail,
      phone: String(phone).trim(),
      password,
    });

    professorServiceLogger.info(`professor created id=${professor._id}`);

    return res.status(201).json({
      id: professor._id,
      name: professor.name,
      email: professor.email,
      phone: professor.phone,
      createdAt: professor.createdAt,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "email already registered" });
    }
    professorServiceLogger.error(`create professor failed: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
});

// List all professors. Open to admins and any logged-in professor or student
// (so students can see who teaches what — adjust roles if your assignment
// requires stricter access).
router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT, ROLES.ENROLLMENT_SERVICE]),
  async (_req, res) => {
    try {
      const professors = await Professor.find().select("-password").sort({ createdAt: -1 });
      return res.status(200).json(professors);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// Get one — professors only get their own record, staff/students can read any.
router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT]),
  restrictProfessorToOwnData,
  async (req, res) => {
    try {
      const professor = await Professor.findById(req.params.id).select("-password");
      if (!professor) {
        return res.status(404).json({ error: "professor not found" });
      }
      return res.status(200).json(professor);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// Update — admin can change anyone, professor can only edit themselves.
router.put(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictProfessorToOwnData,
  async (req, res) => {
    const { name, email, phone } = req.body || {};
    const update = {};
    if (name) update.name = String(name).trim();
    if (email) update.email = String(email).trim().toLowerCase();
    if (phone) update.phone = String(phone).trim();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "nothing to update" });
    }

    try {
      const professor = await Professor.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      ).select("-password");
      if (!professor) {
        return res.status(404).json({ error: "professor not found" });
      }
      return res.status(200).json(professor);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "email already registered" });
      }
      return res.status(400).json({ error: error.message });
    }
  }
);

// Delete — admin only.
router.delete("/:id", verifyRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const professor = await Professor.findByIdAndDelete(req.params.id);
    if (!professor) {
      return res.status(404).json({ error: "professor not found" });
    }
    professorServiceLogger.info(`professor deleted id=${req.params.id}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
