const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensures that product names are unique
    index: true, // Creates an index on the name field for faster lookups
  },
  factoryId: [{
    type: String,
    required: true,
    index: true, // Creates an index on the name field for faster lookups
  }],
  price: {
    type: Number,
    required: true,
    min: 0, 
  },
  expectedSoldAt: {
    type: Number,
    required: true,
    min: 0, 
  },
  images: [{ url: String, filename: String }],
  quantity: {
    type: Number,
    required: true,
    min: 0, // Ensures quantity cannot be negative
  },
});

const Product = mongoose.model("Product", productSchema, "Products");

module.exports = Product;

/*
{
  "name":"ball",
  "factoryId":"Dsa",
  "price":32,
  "expectedSoldAt":40
  "imageUrl":[],
  "quantity":421
  
}

*/



 