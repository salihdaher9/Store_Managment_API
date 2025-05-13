const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const Month = require("../models/Month");
const mongoose = require("mongoose");

module.exports.getTransactions = async (req, res) => {
  try {
    res.status(200).json(res.paginatedResults);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const id = req.params.id;
    const oldTransaction = await Transaction.findById(id).session(session);
    if (!oldTransaction) throw new Error("Transaction not found");

    const month = await Month.findOne({
      year: oldTransaction.transactionTime.getFullYear(),
      month: oldTransaction.transactionTime.getMonth() + 1,
    }).session(session);

    if (!month) throw new Error("Month document not found");

    month.totalProfit -= oldTransaction.profit;
    month.totalEarnings -= oldTransaction.totalAfterDiscount;
    month.TotalPayed -= oldTransaction.TotalPayed;
    month.transactionCount -= 1;
    await month.save({ session });

    for (const item of oldTransaction.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product)
        throw new Error(`Product not found for ID: ${item.productId}`);
      product.quantity += item.quantity;
      await product.save({ session });
    }

    const items = req.body.items;
    let TotalPayed = 0;
    const newItems = [];
    const { totalBeforeDiscount, totalAfterDiscount } = req.body;

    for (const item of items) {
      const MyProduct = await Product.findOne({ name: item.name }).session(
        session
      );
      if (!MyProduct)
        throw new Error(`Product with name: ${item.name} not found`);
      if (MyProduct.quantity < item.quantity)
        throw new Error(`Insufficient stock for product: ${item.name}`);

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

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id },
      {
        items: newItems,
        totalBeforeDiscount,
        totalAfterDiscount,
        TotalPayed,
        profit: totalAfterDiscount - TotalPayed,
      },
      { new: true, session }
    );

    if (!updatedTransaction)
      throw new Error("Transaction not found after update");

    const currentMonth = await Month.findOne({
      year: updatedTransaction.transactionTime.getFullYear(),
      month: updatedTransaction.transactionTime.getMonth() + 1,
    }).session(session);

    if (!currentMonth) throw new Error("Month document not found after update");

    currentMonth.totalEarnings += updatedTransaction.totalAfterDiscount;
    currentMonth.totalProfit += updatedTransaction.profit;
    currentMonth.transactionCount++;
    currentMonth.TotalPayed += updatedTransaction.TotalPayed;

    await currentMonth.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(updatedTransaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports.deleteTransaction = async (req, res) => {
  try {
    const id = req.params.id;
    const transaction = await Transaction.findById(id);

    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });

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
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    const deletedTransaction = await Transaction.findByIdAndDelete(id);
    if (!deletedTransaction)
      return res
        .status(404)
        .json({ error: "Transaction not found after delete" });

    res.status(200).json(deletedTransaction);
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.getTodaysTransactions = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const transactions = await Transaction.find({
      transactionTime: { $gte: startOfDay, $lt: endOfDay },
    })
      .sort({ transactionTime: -1 })
      .populate({ path: "items.productId", select: "name images.url" });

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching today's transactions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getCurrentMonthTransactions = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const response = {};

    const totalCount = await Transaction.countDocuments({
      transactionTime: { $gte: startOfMonth },
    });

    if (!(endIndex > totalCount)) response.next = { page: page + 1, limit };
    if (startIndex > 0) response.previous = { page: page - 1, limit };

    const transactions = await Transaction.find({
      transactionTime: { $gte: startOfMonth },
    })
      .sort({ transactionTime: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate({ path: "items.productId", select: "name images.url" });

    response.results = transactions;

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching current month transactions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getThisWeekTransactions = async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      transactionTime: { $gte: startOfWeek, $lte: now },
    })
      .sort({ transactionTime: -1 })
      .populate({ path: "items.productId", select: "name images.url" });

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching this week's transactions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.getTransactionsByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;

    if (!month || !year || isNaN(month) || isNaN(year)) {
      return res
        .status(400)
        .json({ message: "Invalid month or year provided." });
    }

    const targetMonth = parseInt(month) - 1;
    const targetYear = parseInt(year);

    const monthExists = await Month.findOne({
      month: targetMonth + 1,
      year: targetYear,
    });

    if (!monthExists) {
      return res
        .status(404)
        .json({ message: "No records found for this month." });
    }

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 1);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const response = {};

    const totalCount = await Transaction.countDocuments({
      transactionTime: { $gte: startOfMonth, $lt: endOfMonth },
    });

    if (!(endIndex > totalCount)) response.next = { page: page + 1, limit };
    if (startIndex > 0) response.previous = { page: page - 1, limit };

    const transactions = await Transaction.find({
      transactionTime: { $gte: startOfMonth, $lt: endOfMonth },
    })
      .sort({ transactionTime: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate({ path: "items.productId", select: "name images.url" });

    response.results = transactions;

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching transactions by month:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const items = req.body.items;
    const newItems = [];
    let TotalPayed = 0;
    const { totalBeforeDiscount, totalAfterDiscount } = req.body;

    for (const item of items) {
      const MyProduct = await Product.findOne({ name: item.name }).session(
        session
      );
      if (!MyProduct)
        throw new Error(`Product with name: ${item.name} not found`);
      if (MyProduct.quantity < item.quantity)
        throw new Error(`Insufficient stock for product: ${item.name}`);

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
      totalBeforeDiscount,
      totalAfterDiscount,
      TotalPayed,
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

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(newTransaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: error.message });
  }
};
