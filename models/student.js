const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Define the Student Schema

const studentSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        trim: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password:{
        type: String,
        required: true,
        minlength: 6
    },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }]
},);                                          

// Create the Student model
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;