const Product = require("../models/Product");
const {cloudinary} = require("../cloudinary");

module.exports.GetProducts=async (req,res) => {
  res.status(200).send(res.paginatedResults);
  

};
module.exports.GetProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.send(product);
};

module.exports.GetProductByFactoryId = async (req, res) => {
  const product = await Product.findOne({factoryId: req.params.id});
  res.send(product);
};



module.exports.CreateProduct = async (req, res) => {
  try {
    const factoryId = req.body.factoryId;

    // Check if this factoryId is already in use
    const existingProduct = await Product.findOne({
      factoryId: factoryId, // Matches even inside arrays
    });

    if (existingProduct) {
      return res.status(400).json({
        error: "This factory ID is already assigned to another product",
        conflictProductId: existingProduct._id,
      });
    }

    const product = new Product({
      ...req.body,
      factoryId: [factoryId], 
    });

    if (req.file) {
      product.images = [{ url: req.file.path, filename: req.file.filename }];
    } else {
      product.images = [];
    }

    await product.save();
    res.status(200).send("Created product");
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: "Server error while creating product" });
  }
};


module.exports.AddIdToProduct = async (req, res) => {
  try {
    const newFactoryId = req.body.factoryId; // fixed: get value directly
    const product = await Product.findById(req.params.id); // also fixed: use findById

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const conflict = await Product.findOne({
      _id: { $ne: req.params.id }, // exclude this product
      factoryId: newFactoryId,
    });
    if (conflict) {
      return res.status(400).json({
        error: "This factory ID already exists in another product",
        conflictProductId: conflict._id,
      });
    }
    if (product.factoryId.includes(newFactoryId)) {
      return res.status(200).send("ID already exists in this product");
    }

    product.factoryId.push(newFactoryId);
    product.quantity+=req.body.quantity
    await product.save();
    return res.status(200).send("ID added to product");
  } catch (error) {
    console.error("Error adding factoryId:", error);
    res.status(500).json({ error: "Server error" });
  }
};




module.exports.UpdateProduct=async (req,res) => {

  const updateData = req.body;

  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: req.params.id },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found with the given factoryId" });
  }
    
  if (req.file) {
      console.log("files")
      await cloudinary.uploader.destroy(updatedProduct.images[0].filename);
      updatedProduct.images = [{ url: req.file.path, filename: req.file.filename }];
  }
  await updatedProduct.save();
  
  console.log(updatedProduct);
  res.status(200).send(updatedProduct);
};







module.exports.UpdateProductByFactoryid = async (req, res) => {
  const { factoryId } = req.params;

  const updateData = req.body;

  const updatedProduct = await Product.findOneAndUpdate(
    { factoryId: factoryId },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found with the given factoryId" });
  }
    
  if (req.file) {
      console.log("files")
      await cloudinary.uploader.destroy(updatedProduct.images[0].filename);
      updatedProduct.images = [{ url: req.file.path, filename: req.file.filename }];
  }
  await updatedProduct.save();
  
  console.log(updatedProduct);
  res.status(200).send(updatedProduct);
};

module.exports.DeleteProduct=async (req,res) => {
  const id=req.params.id;
  const deletedProduct = await Product.findByIdAndDelete(id);
  if (deletedProduct.images.length){
    await cloudinary.uploader.destroy(deletedProduct.images[0].filename);
  }
  res.status(200).send(deletedProduct);
}

module.exports.AddToProduct=async (req,res) => {
    if (!req.body.quantity){
      return res.status(404).send("quantity is required")
    }
    if(!(req.body.quantity > 0)){
      return res.status(404).send("quantity must be greater than 0")
    }
    const id = req.params.id;
    const product = await Product.findById(id)
    product.quantity += req.body.quantity;
    await product.save();

    res.status(200).send(product);

}


module.exports.AddToProductByFactoryId = async (req, res) => {
  if (!req.body.quantity) {
    return res.status(404).send("quantity is required");
  }
  if (!(req.body.quantity > 0)) {
    return res.status(404).send("quantity must be greater than 0");
  }
  const factoryId = req.params.factoryId;
  const product=await Product.findOne({
     factoryId: factoryId 

  })

  if (!product) {
    return res.status(404).send("Product not found for the given factory ID");
  }
  
  product.quantity += req.body.quantity;
  await product.save();

  res.status(200).send(product);
};



module.exports.searchProductsByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Missing name query parameter' });
    }

    const products = await Product.find({
      name: { $regex: name, $options: 'i' }, // case-insensitive match
    });

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Server error while searching for products' });
  }
};

module.exports.GetGroupByFactoryId = async (req, res) => {
  try {
    const group = await Product.find({ factoryId: req.params.factoryId });
    if (!group.length) {
      return res
        .status(404)
        .json({ error: "No products found with this factory ID" });
    }
    res.status(200).json(group);
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports.RemoveFactoryIdFromProduct = async (req, res) => {
  try {
    const { factoryId } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!product.factoryId.includes(factoryId)) {
      return res
        .status(404)
        .json({ error: "Factory ID not found in this product" });
    }

    // Remove the factoryId
    product.factoryId = product.factoryId.filter((id) => id !== factoryId);

    // Optional: Adjust quantity? Only if each ID represents a quantity chunk
    // product.quantity -= 1;

    await product.save();
    res.status(200).send("Factory ID removed from product");
  } catch (err) {
    console.error("Error removing factoryId:", err);
    res.status(500).json({ error: "Server error" });
  }
};
