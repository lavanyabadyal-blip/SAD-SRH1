const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const studentRoute = require("./routes/studentRoute");

const app = express();

connectDB();

app.use(express.json());

app.use("/api/students", studentRoute);

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
    console.log(`Student Server Running on port ${PORT}`);
});