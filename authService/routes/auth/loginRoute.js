// Login endpoints. We expose two: one for students and one for professors,
// because each account type lives in its own service and has its own DB.

const express = require("express");
const bcrypt = require("bcryptjs");

const { signToken, fetchStudents, fetchProfessors } = require("./util");
const { ROLES } = require("../../../consts");
const { authServiceLogger } = require("../../../logging");

const router = express.Router();

// POST /api/login/student
// Body: { email, password }
// Returns: { access_token }
router.post("/student", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const students = await fetchStudents();

    // Pull the record matching the supplied email. We compare via bcrypt
    // afterwards so the same generic 401 covers "user not found" and
    // "wrong password" — never leak which one failed.
    const student = students.find((s) => s.email === email.trim().toLowerCase());

    if (!student) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = signToken({ sub: student._id, role: ROLES.STUDENT });
    authServiceLogger.info(`student login ok id=${student._id}`);

    return res.status(200).json({ access_token: token });
  } catch (error) {
    authServiceLogger.error(`student login failed: ${error.message}`);
    return res.status(500).json({ error: "internal error" });
  }
});

// POST /api/login/professor — same shape as student.
router.post("/professor", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const professors = await fetchProfessors();
    const professor = professors.find((p) => p.email === email.trim().toLowerCase());

    if (!professor) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, professor.password);
    if (!isMatch) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = signToken({ sub: professor._id, role: ROLES.PROFESSOR });
    authServiceLogger.info(`professor login ok id=${professor._id}`);

    return res.status(200).json({ access_token: token });
  } catch (error) {
    authServiceLogger.error(`professor login failed: ${error.message}`);
    return res.status(500).json({ error: "internal error" });
  }
});

module.exports = router;
