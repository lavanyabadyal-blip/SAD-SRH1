const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

// Create an Express application
const app = express();
// Connect to the database
connectDB();
//middleware to parse JSON
app.use(express.json());
const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
    console.log(`Student Server Running on port ${PORT}`);
});