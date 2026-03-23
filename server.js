const express = require("express");
const path = require("path");
require("dotenv").config();

require("./db");
require("./mailer");

const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const contactRoutes = require("./contactRoutes");
const friendRequestRoutes = require("./friendRequestRoutes");
const listRoutes = require("./listRoutes");
const passwordRoutes = require("./passwordRoutes");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "PublicHome1.html"));
});

app.use(authRoutes);
app.use(userRoutes);
app.use(contactRoutes);
app.use(friendRequestRoutes);
app.use(listRoutes);
app.use(passwordRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});