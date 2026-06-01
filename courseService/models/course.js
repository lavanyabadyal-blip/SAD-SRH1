// Course model. A course has a unique code (e.g. CS101), a human name,
// an optional description, and a professor who owns it. The professor
// reference is stored as a plain ObjectId — we deliberately do not use
// a Mongoose ref here because Professor lives in a different service.

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    professor: {
      // Stored as ObjectId. Lookup happens via the professor service.
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    capacity: {
      type: Number,
      default: 30,
      min: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
