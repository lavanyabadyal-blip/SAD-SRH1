// Student model. Email is the natural identity (unique + lowercase).
// Password is hashed via a pre-save hook so callers never have to remember
// to hash before saving. timestamps adds createdAt/updatedAt for sorting.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
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
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // Role is "student" by default. Manually promoting a row to "admin"
    // (via Atlas) is how we bootstrap the first administrator in the
    // system. Login picks this up and embeds it in the JWT.
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
  },
  { timestamps: true }
);

// Hash the password before it ever hits the database. Skipped when
// password was not modified so name/email updates do not double-hash.
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method used by authService during login.
studentSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("Student", studentSchema);
