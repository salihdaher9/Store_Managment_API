const express = require("express");
const router = express.Router();
const WrapAsync = require("../Middlewear/catchAsync");
const Authinticate = require("../Middlewear/AuthiticateTokenMiddlwear");
const TransactionController = require("../controllers/TransactionsController");
const paginatedResults = require("../Middlewear/Paginate");
const Transacation = require("../models/Transaction")
const authorize=require("../Middlewear/AuthorizeAdmin");

router.get("/todaysTransactions",Authinticate,WrapAsync(TransactionController.getTodaysTransactions));
router.get("/thisMonthsTransactions",Authinticate,authorize("admin"),WrapAsync(TransactionController.getCurrentMonthTransactions));
router.get("/thisWeeksTransactions",Authinticate,authorize("admin"),WrapAsync(TransactionController.getThisWeekTransactions));
router.get("/transactionsByMonth/:month/:year",Authinticate,authorize("admin"),WrapAsync(TransactionController.getTransactionsByMonth)); 



router
  .route("/")
  .get(Authinticate,WrapAsync(paginatedResults(Transacation)), WrapAsync(TransactionController.getTransactions))
  .post(Authinticate, WrapAsync(TransactionController.createTransaction));

router
  .route("/:id")
  .get(Authinticate, WrapAsync(TransactionController.getTransactionById))
  .put(Authinticate, WrapAsync(TransactionController.updateTransaction))
  .delete(Authinticate, WrapAsync(TransactionController.deleteTransaction));


module.exports = router;
