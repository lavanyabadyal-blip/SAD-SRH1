// Course routes — admins manage courses, professors edit only their own,
// everyone can read.

const express = require("express");

const Course = require("../models/course");
const { verifyRole } = require("./auth/util");
const { ROLES } = require("../../consts");
const { courseServiceLogger } = require("../../logging");

const router = express.Router();

// Only the professor who owns the course (or an admin) may edit/delete.
// Pulled out as a helper so we do not repeat the check in three handlers.
function isOwnerOrAdmin(user, course) {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.PROFESSOR && String(course.professor) === String(user.sub)) return true;
  return false;
}

// POST /api/courses — only admins and professors can create courses.
// Professors must create the course under their own id.
router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    const { code, name, description, professor, capacity } = req.body || {};

    if (!code || !name) {
      return res.status(400).json({ error: "code and name are required" });
    }

    // For professor tokens, force the professor field to themselves so
    // they cannot create courses owned by someone else.
    const ownerId = req.user.role === ROLES.ADMIN ? professor : req.user.sub;
    if (!ownerId) {
      return res.status(400).json({ error: "professor id required" });
    }

    try {
      const course = await Course.create({
        code: String(code).trim().toUpperCase(),
        name: String(name).trim(),
        description: description ? String(description).trim() : "",
        professor: ownerId,
        capacity: capacity || 30,
      });

      courseServiceLogger.info(`course created code=${course.code}`);
      return res.status(201).json(course);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "course code already exists" });
      }
      return res.status(400).json({ error: error.message });
    }
  }
);

// GET /api/courses — anyone authenticated can list.
router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT, ROLES.ENROLLMENT_SERVICE]),
  async (_req, res) => {
    try {
      const courses = await Course.find().sort({ createdAt: -1 });
      return res.status(200).json(courses);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/courses/:id
router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT, ROLES.ENROLLMENT_SERVICE]),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) return res.status(404).json({ error: "course not found" });
      return res.status(200).json(course);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/courses/:id — admin or the owning professor.
router.put(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) return res.status(404).json({ error: "course not found" });

      if (!isOwnerOrAdmin(req.user, course)) {
        return res.status(403).json({ error: "not your course" });
      }

      const { name, description, capacity } = req.body || {};
      if (name) course.name = String(name).trim();
      if (description !== undefined) course.description = String(description).trim();
      if (capacity) course.capacity = capacity;

      await course.save();
      return res.status(200).json(course);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
);

// DELETE /api/courses/:id — admin or owning professor.
router.delete(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) return res.status(404).json({ error: "course not found" });

      if (!isOwnerOrAdmin(req.user, course)) {
        return res.status(403).json({ error: "not your course" });
      }

      await course.deleteOne();
      courseServiceLogger.info(`course deleted code=${course.code}`);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
