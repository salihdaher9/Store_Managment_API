const mongoose = require("mongoose");


const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: { type: String, enum: ["user", "admin"], default: "user" }, // Default is "user"
});

const User = mongoose.model("User", UserSchema);

module.exports = User;


