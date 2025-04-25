const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const Month=require("../models/Month");
const mongoose = require("mongoose");


module.exports.getTransactions = async (req, res) => {
    res.status(200).send(res.paginatedResults);

};

module.exports.getTransactionById = async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  res.status(200).send(transaction);
};


module.exports.updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const id = req.params.id;

    // Find the old transaction
    const oldTransaction = await Transaction.findById(id).session(session);
    if (!oldTransaction) {
      throw new Error("Transaction not found");
    }

    // Update the old month totals
    const month = await Month.findOne({
      year: oldTransaction.transactionTime.getFullYear(),
      month: oldTransaction.transactionTime.getMonth() + 1,
    }).session(session);

    if (!month) {
      throw new Error("Month document not found");
    }

    month.totalProfit -= oldTransaction.profit;
    month.totalEarnings -= oldTransaction.totalAfterDiscount;
    month.TotalPayed -= oldTransaction.TotalPayed;
    month.transactionCount -= 1;
    await month.save({ session });

    // Revert the stock for the old transaction items
    for (const item of oldTransaction.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product not found for ID: ${item.productId}`);
      }
      product.quantity += item.quantity;
      await product.save({ session });
    }

    // Process the new items from the request
    const items = req.body.items;
    let TotalPayed = 0;
    const newItems = [];
    const totalBeforeDiscount = req.body.totalBeforeDiscount;
    const totalAfterDiscount = req.body.totalAfterDiscount;

    for (const item of items) {
      const MyProduct = await Product.findOne({ name: item.name }).session(
        session
      );
      if (!MyProduct) {
        throw new Error(`Product with name: ${item.name} not found`);
      }
      if (MyProduct.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${item.name}`);
      }

      MyProduct.quantity -= item.quantity;
      TotalPayed += MyProduct.price * item.quantity;
      await MyProduct.save({ session });

      newItems.push({
        productId: MyProduct._id,
        priceBaughtAt: MyProduct.price * item.quantity,
        priceSoldAt: item.priceSoldAt,
        quantity: item.quantity,
      });
    }

    // Update the transaction
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id }, // Find by ID
      {
        items: newItems,
        totalBeforeDiscount: totalBeforeDiscount,
        totalAfterDiscount: totalAfterDiscount,
        TotalPayed: TotalPayed,
        profit: totalAfterDiscount - TotalPayed,
      },
      { new: true, session } // Pass the session to ensure it's part of the transaction
    );

    if (!updatedTransaction) {
      throw new Error("Transaction not found");
    }

    // Update the current month totals
    const currentMonth = await Month.findOne({
      year: updatedTransaction.transactionTime.getFullYear(),
      month: updatedTransaction.transactionTime.getMonth() + 1,
    }).session(session);

    if (!currentMonth) {
      throw new Error("Month document not found for the updated transaction");
    }

    currentMonth.totalEarnings += updatedTransaction.totalAfterDiscount;
    currentMonth.totalProfit += updatedTransaction.profit;
    currentMonth.transactionCount++;
    currentMonth.TotalPayed += updatedTransaction.TotalPayed;

    await currentMonth.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json(updatedTransaction);
  } catch (error) {
    // Roll back all changes made during the transaction
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};

module.exports.deleteTransaction = async (req, res) => {
  const id = req.params.id;

  try {
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const month = await Month.findOne({
      year: transaction.transactionTime.getFullYear(),
      month: transaction.transactionTime.getMonth() + 1,
    });

    if (month) {
      month.totalProfit -= transaction.profit;
      month.totalEarnings -= transaction.totalAfterDiscount;
      month.totalPayed -= transaction.TotalPayed;
      month.transactionCount -= 1;
      await month.save();
    }

    for (const item of transaction.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ error: "Product not found in transaction" });
      }
      product.quantity += item.quantity;
      await product.save();
    }

    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.status(200).json(deletedTransaction);
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



module.exports.getTodaysTransactions = async (req, res) => {
    // Get the current date
    const now = new Date();

    // Create the start and end of the day
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ); // Start of today (00:00:00)
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    ); // Start of tomorrow (00:00:00)

    // Find all transactions made today
    const transactions = await Transaction.find({
      transactionTime: {
        $gte: startOfDay,
        $lt: endOfDay, // Use less than to avoid including tomorrow's transactions
      },
    })
      .sort({ transactionTime: -1 })
      .populate({
        path: "items.productId",
        select: "name images.url", // Include 'images.url' to populate the URL field
      });

    // Send the response
    res.status(200).json(transactions);
  
  
  };

module.exports.getCurrentMonthTransactions = async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Extract page and limit from query parameters
  const page = parseInt(req.query.page); // Default to page 1
  const limit = parseInt(req.query.limit); // Default to 10 items per page

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const response = {};

  // Count total transactions for the current month
  const totalCount = await Transaction.countDocuments({
    transactionTime: { $gte: startOfMonth },
  });

  // Prepare the paginated response

 if (! (endIndex > totalCount)) {
      response.next = {
        page: page + 1,
        limit: limit,
      };
    }

    if (startIndex > 0) {
      response.previous = {
        page: page - 1,
        limit: limit,
      };

    }
  // Fetch the current month's transactions with pagination
  const transactions = await Transaction.find({
    transactionTime: { $gte: startOfMonth },
  })
    .sort({ transactionTime: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate({
      path: "items.productId",
      select: "name images.url", // Include 'images.url' to populate the URL field
    });

  // Add results to the response
  response.results = transactions;

  // Send the response
  res.status(200).json(response);
};




module.exports.getThisWeekTransactions = async (req, res) => {
  try {
    const now = new Date();

    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diffToSunday = dayOfWeek * 24 * 60 * 60 * 1000;
    startOfWeek.setTime(startOfWeek.getTime() - diffToSunday);
    startOfWeek.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      transactionTime: {
        $gte: startOfWeek,
        $lte: now, // Up to the current time
      },
    })
      .sort({ transactionTime: -1 })
      .populate({
        path: "items.productId",
        select: "name images.url", // Include 'images.url' to populate the URL field
      });

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching this week's transactions:", error);
    res.status(500).json({ error: "Failed to fetch this week's transactions" });
  }
};


module.exports.getTransactionsByMonth = async (req, res) => {
  // Extract month and year from URL parameters
  const { month, year } = req.params;


  if (!month || !year || isNaN(month) || isNaN(year)) {
    return res.status(400).json({ message: "Invalid month or year provided." });
  }



  // Convert month and year to integers
  const targetMonth = parseInt(month) - 1; // JavaScript months are 0-based
  const targetYear = parseInt(year);

  const monthExists = await Month.findOne({
      month: targetMonth +1,
      year: targetYear,
    });
  console.log(targetMonth,targetYear)
  if(!monthExists){
          console.log("no such month")
          return res.status(404).json({ message: "No records found for this month." });
    }

  // Calculate the start and end dates for the given month and year
  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 1); // Start of the next month

  // Extract page and limit from query parameters
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const response = {};

  try {
    // Count total transactions for the given month
    const totalCount = await Transaction.countDocuments({
      transactionTime: { $gte: startOfMonth, $lt: endOfMonth },
    });

    // Prepare pagination info
    if (!(endIndex > totalCount)) {
      response.next = {
        page: page + 1,
        limit: limit,
      };
    }

    if (startIndex > 0) {
      response.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    // Fetch the transactions for the given month with pagination
    const transactions = await Transaction.find({
      transactionTime: { $gte: startOfMonth, $lt: endOfMonth },
    })
      .sort({ transactionTime: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate({
        path: "items.productId",
        select: "name images.url", // Include 'images.url' to populate the URL field
      });

    // Add results to the response
    response.results = transactions;

    // Send the response
    res.status(200).json(response);
  } catch (error) {
    // Handle any potential errors
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};




module.exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const items = req.body.items;
    const newItems = [];
    let TotalPayed = 0;
    let totalBeforeDiscount = req.body.totalBeforeDiscount;
    let totalAfterDiscount = req.body.totalAfterDiscount;

    for (const item of items) {
      const MyProduct = await Product.findOne({ name: item.name }).session(session);
      if (!MyProduct) {
        throw new Error(`Product with name: ${item.name} not found`);
      }
      if (MyProduct.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${item.name}`);
      }

      MyProduct.quantity -= item.quantity;
      TotalPayed += MyProduct.price * item.quantity;
      await MyProduct.save({ session });

      newItems.push({
        productId: MyProduct._id,
        priceBaughtAt: MyProduct.price * item.quantity,
        priceSoldAt: item.priceSoldAt,
        quantity: item.quantity,
      });
    }

    const newTransaction = new Transaction({
      transactionTime: new Date(),
      items: newItems,
      totalBeforeDiscount: totalBeforeDiscount,
      totalAfterDiscount: totalAfterDiscount,
      TotalPayed: TotalPayed,
      profit: totalAfterDiscount - TotalPayed,
    });

    const currentMonthExists = await Month.findOne({
      year: newTransaction.transactionTime.getFullYear(),
      month: newTransaction.transactionTime.getMonth() + 1,
    }).session(session);

    if (!currentMonthExists) {
      const newMonth = new Month({
        year: newTransaction.transactionTime.getFullYear(),
        month: newTransaction.transactionTime.getMonth() + 1,
        totalPayed: newTransaction.TotalPayed,
        totalEarnings: newTransaction.totalAfterDiscount,
        totalProfit: newTransaction.profit,
        transactionCount: 1,
      });
      await newMonth.save({ session });
    } else {
      currentMonthExists.totalEarnings += newTransaction.totalAfterDiscount;
      currentMonthExists.totalProfit += newTransaction.profit;
      currentMonthExists.transactionCount++;
      currentMonthExists.totalPayed += newTransaction.TotalPayed;
      await currentMonthExists.save({ session });
    }

    await newTransaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(newTransaction);
  } catch (error) {
    // Roll back all changes made during the transaction
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};
