const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");


module.exports.GetUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.GetUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports.login = async (req, res) => {

  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    const error = new Error("Resource not found");
    error.status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Resource not found");
    error.status = 401;
    throw error;
  }

  // Access token 
  const accessToken = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  // refresh token 
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: true, 
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });

  res.json({
    accessToken,
    id: user._id,
    username: user.username,
    role: user.role,
  });
};

const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports.refreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401); // No refresh token sent

  const refreshToken = cookies.jwt;

  // Find user with that refresh token
  const user = await User.findOne({ refreshToken });
  if (!user) return res.sendStatus(403); // Token not found in DB

  // Verify refresh token
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err || user._id.toString() !== decoded.id) return res.sendStatus(403);

    // Issue new access token
    const accessToken = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  });
};
