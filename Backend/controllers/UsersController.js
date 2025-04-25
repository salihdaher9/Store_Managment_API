
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

module.exports.GetUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

module.exports.GetUser = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
};

module.exports.register = async (req, res) => {
  
  const { username, password } = req.body;
  console.log(req.body,username,password)
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ error: "Username already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword, role :req.body.role });
  await newUser.save();
  res.status(201).json({ message: "User registered successfully" });
};

module.exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    const error = new Error("Resource not found");
    error.status = 401; // Set the HTTP status code
    throw error;
  }
  if (await bcrypt.compare(password, user.password)) {
    const AccessToken = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET
    );
    return res.json({
      AccessToken: AccessToken,
      id: user._id,
      username: user.username,
      role: user.role
    });
  }
  else{
    const error = new Error("Resource not found");
    error.status = 401; // Set the HTTP status code
    throw error;
  }

};
