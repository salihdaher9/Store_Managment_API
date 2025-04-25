const Transaction = require("../models/Transaction");
const Month= require("../models/Month");
function getStartOfCurrentWeek() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const daysToSunday = dayOfWeek; // Distance to the previous Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0); // Clear time part
  startOfWeek.setDate(now.getDate() - daysToSunday); // Go back to last Sunday
  return startOfWeek;
}

function getStartOfCurrentDay() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set time to midnight
  return now;
}
module.exports.getMonths=async(req,res)=>{
  const months = await Month.find();
  res.status(200).send(months);

}
module.exports.getCurrentMonthTotals=async (req,res)=>{
  const now = new Date();
  const month=now.getMonth()+1;
  const year=now.getFullYear();

  const CurrentMonth=await Month.findOne({
    year: year,
    month: month,
  })


  if (!CurrentMonth) {
    return res.status(404).json({ error: "No such month found" });
  }
  res.status(200).send({
    totalPayed: CurrentMonth.totalPayed,
    totalEarnings: CurrentMonth.totalEarnings,
    totalProfit: CurrentMonth.totalProfit,
  });
}

module.exports.getCurrentWeekTotals = async (req,res) => {

  const startOfWeek = getStartOfCurrentWeek();
  console.log("before")

  const results = await Transaction.aggregate([
    {
      $match: {
        transactionTime: { $gte: startOfWeek }, // Only include transactions from the start of the month
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$TotalPayed" },
        totalEarnings: { $sum: "$totalAfterDiscount" },
        totalProfit: { $sum: "$profit" },
      },
    },
  ]);
  console.log("after");


  // Format results
    const totals = results[0] || {
      totalPaid: 0,
      totalEarnings: 0,
      totalProfit: 0,
    };
    res.json(totals);
  
};


module.exports.getSepecificMonth=async(req,res)=>{
  const { month, year } = req.params;
  console.log(month, year);
  const selectedMonth =await Month.findOne({ month: month, year: year});
  res.json(selectedMonth)

}


module.exports.getCurrentDayTotals = async (req, res) => {
    
    const startOfDay = getStartOfCurrentDay();
    console.log("Calculating totals from the start of the day");

    const results = await Transaction.aggregate([
      {
        $match: {
          transactionTime: { $gte: startOfDay }, // Only include transactions from the start of the day
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$TotalPayed" },
          totalEarnings: { $sum: "$totalAfterDiscount" },
          totalProfit: { $sum: "$profit" },
        },
      },
    ]);

    // Format and send results
    const totals = results[0] || {
      totalPaid: 0,
      totalEarnings: 0,
      totalProfit: 0,
    };
    res.json(totals);

};


module.exports.getTotalFromTo = async (req, res) => {
  // Extract 'from' and 'to' parameters from the request
  const { fromMonth, fromYear, toMonth, toYear } = req.params;

  // Parse the month and year from the request
  const parsedFromMonth = parseInt(fromMonth) - 1; // Month is 0-indexed
  const parsedFromYear = parseInt(fromYear);
  const parsedToMonth = parseInt(toMonth) - 1; // Month is 0-indexed
  const parsedToYear = parseInt(toYear);

  // Create date objects for the start and end of the period
  const startDate = new Date(parsedFromYear, parsedFromMonth, 1); // Start of 'from' month
  const endDate = new Date(parsedToYear, parsedToMonth + 1, 0); // End of 'to' month

  // Perform aggregation to get total amounts
  const results = await Transaction.aggregate([
    {
      $match: {
        transactionTime: {
          $gte: startDate, // Greater than or equal to start date
          $lte: endDate, // Less than or equal to end date
        },
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$TotalPayed" },
        totalAfterDiscount: { $sum: "$totalAfterDiscount" },
        totalProfit: { $sum: "$profit" },
      },
    },
  ]);

  // Format the results
  const totals = results[0] || {
    totalPaid: 0,
    totalAfterDiscount: 0,
    totalProfit: 0,
  };

  // Send the response
  res.status(200).json(totals);
};




module.exports.getTotalsForCertainDate = async (req, res) => {
    const { day, month, year } = req.params;

    // Validate input
    if (!day || !month || !year) {
      return res
        .status(400)
        .json({ error: "Day, month, and year are required." });
    }

    // Create date objects for the start and end of the day
    const startDate = new Date(year, month - 1, day); // Start of the specified day
    const endDate = new Date(year, month - 1, day + 1); // Start of the next day

    // Perform aggregation to get total amounts
    const results = await Transaction.aggregate([
      {
        $match: {
          transactionTime: {
            $gte: startDate, // Greater than or equal to start date
            $lt: endDate, // Less than the start of the next day
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$TotalPayed" },
          totalAfterDiscount: { $sum: "$totalAfterDiscount" },
          totalProfit: { $sum: "$profit" },
        },
      },
    ]);

    // Format results
    const totals = results[0] || {
      totalPaid: 0,
      totalAfterDiscount: 0,
      totalProfit: 0,
    };

    // Send response
    res.status(200).json(totals);
  } ;