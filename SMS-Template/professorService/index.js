const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const professorRoute = require("./routes/professorRoute");

const app = express();

connectDB();

app.use(express.json());

app.use("/api/professors", professorRoute);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Professor Server running on port ${PORT}`);
});
