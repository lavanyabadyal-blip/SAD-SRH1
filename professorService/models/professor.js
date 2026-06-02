// Professor model. Same shape as Student plus a phone field that
// distinguishes a professor record. timestamps used for sorting.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const professorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // Professors can also be promoted to admin via Atlas if desired.
    role: {
      type: String,
      enum: ["professor", "admin"],
      default: "professor",
    },
  },
  { timestamps: true }
);

professorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

professorSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("Professor", professorSchema);
