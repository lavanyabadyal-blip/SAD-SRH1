// Enrollment routes. An enrollment connects one student to one course.
// Reads can be enriched with student/course details by calling those
// services and stitching the data together in this layer.

const express = require("express");

const Enrollment = require("../models/enrollment");
const {
  verifyRole,
  restrictStudentToOwnData,
  fetchStudents,
  fetchCourses,
} = require("./auth/util");
const { ROLES } = require("../../consts");
const { enrollmentServiceLogger } = require("../../logging");

const router = express.Router();

// Convenience: extract the raw Bearer token off the request to forward to other services.
function bearer(req) {
  const h = req.headers["authorization"] || "";
  return h.startsWith("Bearer ") ? h.slice("Bearer ".length) : "";
}

// POST /api/enrollments — admins and professors can enroll students.
router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    const { student, course } = req.body || {};
    if (!student || !course) {
      return res.status(400).json({ error: "student and course are required" });
    }

    try {
      const enrollment = await Enrollment.create({ student, course });
      enrollmentServiceLogger.info(`enrolled student=${student} course=${course}`);
      return res.status(201).json(enrollment);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "student already enrolled in this course" });
      }
      enrollmentServiceLogger.error(`enroll failed: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }
  }
);

// GET /api/enrollments — admins and professors.
router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (_req, res) => {
    try {
      const enrollments = await Enrollment.find().sort({ createdAt: -1 });
      return res.status(200).json(enrollments);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/enrollments/student/:id — a student sees their own, staff see anyone.
router.get(
  "/student/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT]),
  restrictStudentToOwnData,
  async (req, res) => {
    try {
      const enrollments = await Enrollment.find({ student: req.params.id });

      if (enrollments.length === 0) {
        return res.status(200).json([]);
      }

      // Enrich with course details from the course service. If that call
      // fails we still return the raw enrollment ids — partial data beats
      // a 500 here.
      let courses = [];
      try {
        courses = await fetchCourses(bearer(req));
      } catch (e) {
        enrollmentServiceLogger.warn(`course fetch failed during enrichment: ${e.message}`);
      }

      const enriched = enrollments.map((enrollment) => {
        const obj = enrollment.toObject();
        const course = courses.find((c) => String(c._id) === String(obj.course));
        if (course) obj.course = course;
        return obj;
      });

      return res.status(200).json(enriched);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/enrollments/course/:id — admins and professors only.
router.get(
  "/course/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const enrollments = await Enrollment.find({ course: req.params.id });

      if (enrollments.length === 0) {
        return res.status(200).json([]);
      }

      let students = [];
      try {
        students = await fetchStudents(bearer(req));
      } catch (e) {
        enrollmentServiceLogger.warn(`student fetch failed during enrichment: ${e.message}`);
      }

      const enriched = enrollments.map((enrollment) => {
        const obj = enrollment.toObject();
        const student = students.find((s) => String(s._id) === String(obj.student));
        if (student) obj.student = student;
        return obj;
      });

      return res.status(200).json(enriched);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/enrollments/:id — admin or professor (unenroll a student).
router.delete(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
      if (!enrollment) {
        return res.status(404).json({ error: "enrollment not found" });
      }
      enrollmentServiceLogger.info(`enrollment deleted id=${req.params.id}`);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
