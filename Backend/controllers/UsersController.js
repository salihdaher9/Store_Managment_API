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
  const cookies = req.cookies;
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

  // Generate access token
  const accessToken = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  // Generate refresh token
  const newRefreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Filter out any existing refresh token (if present)
  let newRefreshTokenArray = user.refreshTokens;
  if (cookies?.jwt) {
    newRefreshTokenArray = user.refreshTokens.filter(
      (rt) => rt !== cookies.jwt
    );

    // Clear old cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });
  }

  // Add new refresh token to the array
  user.refreshTokens = [...newRefreshTokenArray, newRefreshToken];
  await user.save();

  // Set the new refresh token in cookie
  res.cookie("jwt", newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Send access token + user info
  res.json({
    accessToken,
    id: user._id,
    username: user.username,
    role: user.role,
  });
};



module.exports.refreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401);

  const oldRefreshToken = cookies.jwt;

  res.clearCookie("jwt", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });

  const user = await User.findOne({ refreshTokens: oldRefreshToken });

  //  Reuse detection
  if (!user) {
    jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) return res.sendStatus(403);

        console.log("Refresh token reuse detected for user:", decoded.id);

        const hackedUser = await User.findById(decoded.id);
        if (hackedUser) {
          hackedUser.refreshTokens = [];
          await hackedUser.save();
        }

        return res.sendStatus(403);
      }
    );
    return;
  }
  
  // Valid token — rotate it
  jwt.verify(
    oldRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err || user._id.toString() !== decoded.id) return res.sendStatus(403);

      // Remove the used token
      user.refreshTokens = user.refreshTokens.filter(
        (token) => token !== oldRefreshToken
      );

      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      user.refreshTokens.push(newRefreshToken);
      await user.save();

      // Set the new cookie
      res.cookie("jwt", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Issue new access token
      const accessToken = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken });
    }
  );
};



module.exports.logout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No cookie — already logged out

  const refreshToken = cookies.jwt;

  // Find the user by refresh token
  const user = await User.findOne({ refreshTokens: refreshToken });
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(rt =>rt!==refreshToken); // Remove token from DB
    await user.save();
  }

  // Clear the cookie on client
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: true, // use only in production (HTTPS)
    sameSite: "Strict",
  });

  res.sendStatus(204); // Success, no content
};
