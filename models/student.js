const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Define the Student Schema
const studentSchema = new mongoose.Schema({
    
});

// Create the Student model
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;