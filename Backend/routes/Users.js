const express = require("express");
const User = require("../models/User");
const router = express.Router();
const UsersController = require("../controllers/UsersController");
const WrapAsync = require("../Middlewear/catchAsync");
const Authinticate = require("../Middlewear/AuthiticateTokenMiddlwear");

router.get('/',Authinticate,WrapAsync(UsersController.GetUsers));
router.post("/", WrapAsync(UsersController.register));
router.get("/:id", Authinticate, WrapAsync(UsersController.GetUser)); 
router.post("/login",WrapAsync(UsersController.login));
router.get("/refresh", WrapAsync(UsersController.refreshToken));



module.exports = router;


//ibrahem
//ibrahem2