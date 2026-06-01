const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in .env");
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    if ((uri || "").includes("mongodb.net")) {
      console.error(
        "MongoDB connection error: cannot reach Atlas cluster. Check Network Access in Atlas and confirm your current IP is allowed."
      );
    } else {
      console.error(`MongoDB connection error: ${err.message}`);
    }
    throw err;
  }
};

module.exports = connectDB;
