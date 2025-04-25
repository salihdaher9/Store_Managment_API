const mongoose = require("mongoose");


const monthSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 0-11 for January-December
  totalPayed:{ type: Number, required: true},
  totalEarnings: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 },
  transactionCount: { type: Number, default: 0 },
});



// Create the Transaction model
const Month = mongoose.model("Month", monthSchema);

module.exports = Month;
