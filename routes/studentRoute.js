const express = require("express");

const Student = require("../models/student");

const { verifyRole, restrictStudentToOwnData } = require("./auth/util");
const { ROLES } = require("../../consts");

const router = express.Router();

// ───────────────────────────────────────────
// CREATE a student
// POST /
// ───────────────────────────────────────────
router.post("/", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res
            .status(400)
            .json({ message: "Please provide name, email, and password" });
    }

    try {
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res
                .status(400)
                .json({ message: "Student already exists with this email" });
        }

        const newStudent = new Student({ name, email, password });
        const savedStudent = await newStudent.save();

        return res
            .status(201)
            .json({ message: "Student created successfully", student: savedStudent });

    } catch (error) {
        return res
            .status(500)
            .json({ message: "Server error", error: error.message });
    }
});

// ───────────────────────────────────────────
// GET all students
// GET /
// ───────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const students = await Student.find().select("-password");

        if (!students || students.length === 0) {
            return res
                .status(404)
                .json({ message: "No students found" });
        }

        return res
            .status(200)
            .json({ message: "Students fetched successfully", students });

    } catch (error) {
        return res
            .status(500)
            .json({ message: "Server error", error: error.message });
    }
});

// ───────────────────────────────────────────
// UPDATE a student
// PUT /:id
// ───────────────────────────────────────────
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!name && !email && !password) {
        return res
            .status(400)
            .json({ message: "Please provide at least one field to update" });
    }

    try {
        const student = await Student.findById(id);

        if (!student) {
            return res
                .status(404)
                .json({ message: "Student not found" });
        }

        // Only update fields that are provided
        if (name) student.name = name;
        if (email) student.email = email;
        if (password) student.password = password;

        const updatedStudent = await student.save();

        return res
            .status(200)
            .json({ message: "Student updated successfully", student: updatedStudent });

    } catch (error) {
        return res
            .status(500)
            .json({ message: "Server error", error: error.message });
    }
});

module.exports = router;