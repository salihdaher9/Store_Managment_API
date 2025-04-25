const mongoose = require("mongoose");

const getCurrentIsraelTime = () => {
  const currentUtcDate = new Date(); // Get current date in UTC
  const israelOffset = 2 * 60 * 60 * 1000; // UTC+2 in milliseconds
  return new Date(currentUtcDate.getTime() + israelOffset); // Adjust to Israel standard time
};
// Define the Item schema
const itemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // Reference to the Product model
      required: true,
    },
    priceBaughtAt:{
      type: Number,
      required: true,
    },
    priceSoldAt: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
); // Disable automatic ID generation for subdocuments

// Define the Transaction schema
const transactionSchema = new mongoose.Schema(
  {
    transactionTime: {
      type: Date,
      default: getCurrentIsraelTime, // Set default to current date and time
      index: true, // Add this line to create an index on transactionTime
    },
    items: [itemSchema], // Array of Item subdocuments
    totalBeforeDiscount: {
      type: Number,
      required: true,
    },
    totalAfterDiscount: {
      type: Number,
      required: true,
    },
    TotalPayed: {
      type: Number,
      required: true,
    },
    profit: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
); // Automatically add createdAt and updatedAt fields

// Create the Transaction model
const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;






////create transaction body /
//{
//  "items": [
//    {
//      "name": "Toy car",  
//       "priceSoldAt": 60.00,
//      "quantity": 1
//    }
//   ],
//  "totalBeforeDiscount" : 50,
//  "totalAfterDiscount" : 40
//}