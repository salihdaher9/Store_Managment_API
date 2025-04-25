const express = require("express");
const WrapAsync = require("../Middlewear/catchAsync");
const Authenticate = require("../Middlewear/AuthiticateTokenMiddlwear");
const router = express.Router();
const authorize = require("../Middlewear/AuthorizeAdmin");

const FinancesController = require("../controllers/FinancesController");

router.get('/months',Authenticate,WrapAsync(FinancesController.getMonths));
router.get('/months/:month/:year', Authenticate,authorize("admin"),WrapAsync(FinancesController.getSepecificMonth));
router.get('/currentMonth',Authenticate,authorize("admin"),WrapAsync(FinancesController.getCurrentMonthTotals));
router.get("/currentWeek",Authenticate,authorize("admin"), WrapAsync(FinancesController.getCurrentWeekTotals));
router.get("/currentDay",Authenticate, WrapAsync(FinancesController.getCurrentDayTotals))
router.get("/from/:fromMonth/year/:fromYear/to/:toMonth/year/:toYear",Authenticate,authorize("admin"),WrapAsync(FinancesController.getTotalFromTo));
router.get("/getTotalsForDate/:day/:month/:year",Authenticate, WrapAsync(FinancesController.getTotalsForCertainDate));
module.exports=router;



//GET /finances/from/1/year/2024/to/3/year/2024
