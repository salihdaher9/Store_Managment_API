const Transaction = require("../models/Transaction");
const Month = require("../models/Month");

function getStartOfCurrentWeek() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSunday = dayOfWeek;
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - daysToSunday);
  return startOfWeek;
}

function getStartOfCurrentDay() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

module.exports.getMonths = async (req, res) => {
  try {
    const months = await Month.find();
    res.status(200).json(months);
  } catch (error) {
    console.error("Error fetching months:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getCurrentMonthTotals = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const currentMonth = await Month.findOne({ year, month });

    if (!currentMonth) {
      return res.status(404).json({ error: "No such month found" });
    }

    res.status(200).json({
      totalPayed: currentMonth.totalPayed,
      totalEarnings: currentMonth.totalEarnings,
      totalProfit: currentMonth.totalProfit,
    });
  } catch (error) {
    console.error("Error fetching current month totals:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getCurrentWeekTotals = async (req, res) => {
  try {
    const startOfWeek = getStartOfCurrentWeek();

    const results = await Transaction.aggregate([
      {
        $match: {
          transactionTime: { $gte: startOfWeek },
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

    const totals = results[0] || {
      totalPaid: 0,
      totalEarnings: 0,
      totalProfit: 0,
    };

    res.status(200).json(totals);
  } catch (error) {
    console.error("Error fetching current week totals:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getSepecificMonth = async (req, res) => {
  try {
    const { month, year } = req.params;

    const selectedMonth = await Month.findOne({ month, year });

    if (!selectedMonth) {
      return res.status(404).json({ error: "Month not found" });
    }

    res.status(200).json(selectedMonth);
  } catch (error) {
    console.error("Error fetching specific month:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getCurrentDayTotals = async (req, res) => {
  try {
    const startOfDay = getStartOfCurrentDay();

    const results = await Transaction.aggregate([
      {
        $match: {
          transactionTime: { $gte: startOfDay },
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

    const totals = results[0] || {
      totalPaid: 0,
      totalEarnings: 0,
      totalProfit: 0,
    };

    res.status(200).json(totals);
  } catch (error) {
    console.error("Error fetching current day totals:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getTotalFromTo = async (req, res) => {
  try {
    const { fromMonth, fromYear, toMonth, toYear } = req.params;

    const parsedFromMonth = parseInt(fromMonth) - 1;
    const parsedFromYear = parseInt(fromYear);
    const parsedToMonth = parseInt(toMonth) - 1;
    const parsedToYear = parseInt(toYear);

    const startDate = new Date(parsedFromYear, parsedFromMonth, 1);
    const endDate = new Date(parsedToYear, parsedToMonth + 1, 0);

    const results = await Transaction.aggregate([
      {
        $match: {
          transactionTime: {
            $gte: startDate,
            $lte: endDate,
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

    const totals = results[0] || {
      totalPaid: 0,
      totalAfterDiscount: 0,
      totalProfit: 0,
    };

    res.status(200).json(totals);
  } catch (error) {
    console.error("Error fetching totals from range:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getTotalsForCertainDate = async (req, res) => {
  try {
    const { day, month, year } = req.params;

    if (!day || !month || !year) {
      return res
        .status(400)
        .json({ error: "Day, month, and year are required." });
    }

    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(year, month - 1, day + 1);

    const results = await Transaction.aggregate([
      {
        $match: {
          transactionTime: {
            $gte: startDate,
            $lt: endDate,
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

    const totals = results[0] || {
      totalPaid: 0,
      totalAfterDiscount: 0,
      totalProfit: 0,
    };

    res.status(200).json(totals);
  } catch (error) {
    console.error("Error fetching totals for certain date:", error);
    res.status(500).json({ error: "Server error" });
  }
};
