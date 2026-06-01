// Routes for the student resource. Public endpoints (POST /) let anyone
// register a new account. Everything else needs a valid JWT.

const express = require("express");

const Student = require("../models/student");
const { verifyRole, restrictStudentToOwnData, verifyJWTWithJWKS } = require("./auth/util");
const { ROLES } = require("../../consts");
const { studentServiceLogger } = require("../../logging");

const router = express.Router();

// ─── INTERNAL ROUTE ───────────────────────────────────────────
// GET /api/students/internal
// Returns every student WITH the password hash. Used by authService
// during login. Guarded by the auth-service role so only that service
// can read hashes.
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

    const students = await Student.find().sort({ createdAt: -1 });
    return res.status(200).json(students);
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
});

// ─── CREATE ───────────────────────────────────────────────────
// POST /api/students — public route, anyone can register.
router.post("/", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, email and password are required" });
  }

  try {
    // Normalising email up front avoids "Test@x.com" and "test@x.com"
    // becoming two accounts.
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await Student.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: "email already registered" });
    }

    const student = await Student.create({
      name: cleanName,
      email: cleanEmail,
      password,
    });

    studentServiceLogger.info(`student created id=${student._id}`);

    return res.status(201).json({
      id: student._id,
      name: student.name,
      email: student.email,
      createdAt: student.createdAt,
    });
  } catch (error) {
    // Mongo duplicate key error — race condition between the findOne and create above.
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "email already registered" });
    }
    studentServiceLogger.error(`create student failed: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
});

// ─── LIST ─────────────────────────────────────────────────────
// GET /api/students — admins, professors and the enrollment service.
router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.ENROLLMENT_SERVICE]),
  async (_req, res) => {
    try {
      const students = await Student.find().select("-password").sort({ createdAt: -1 });
      return res.status(200).json(students);
    } catch (error) {
      studentServiceLogger.error(`list students failed: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
  }
);

// ─── GET ONE ──────────────────────────────────────────────────
// GET /api/students/:id — own record for students, anything for staff.
router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT]),
  restrictStudentToOwnData,
  async (req, res) => {
    try {
      const student = await Student.findById(req.params.id).select("-password");
      if (!student) {
        return res.status(404).json({ error: "student not found" });
      }
      return res.status(200).json(student);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// ─── UPDATE ──────────────────────────────────────────────────
// PUT /api/students/:id — name and/or email only.
// Password changes belong on a dedicated route to avoid accidental updates.
router.put(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.STUDENT]),
  restrictStudentToOwnData,
  async (req, res) => {
    const { name, email } = req.body || {};

    const update = {};
    if (name) update.name = String(name).trim();
    if (email) update.email = String(email).trim().toLowerCase();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "nothing to update" });
    }

    try {
      const student = await Student.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      ).select("-password");

      if (!student) {
        return res.status(404).json({ error: "student not found" });
      }
      return res.status(200).json(student);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "email already registered" });
      }
      return res.status(400).json({ error: error.message });
    }
  }
);

// ─── DELETE ──────────────────────────────────────────────────
// DELETE /api/students/:id — admin only. Permanent.
router.delete("/:id", verifyRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ error: "student not found" });
    }
    studentServiceLogger.info(`student deleted id=${req.params.id}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
