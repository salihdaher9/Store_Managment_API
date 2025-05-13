const Product = require("../models/Product");
const { cloudinary } = require("../cloudinary");

module.exports.GetProducts = async (req, res) => {
  try {
    res.status(200).json(res.paginatedResults);
  } catch (error) {
    console.error("Error getting products:", error);
    res.status(500).json({ error: "Server error while fetching products" });
  }
};

module.exports.GetProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.GetProductByFactoryId = async (req, res) => {
  try {
    const product = await Product.findOne({ factoryId: req.params.id });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product by factory ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.CreateProduct = async (req, res) => {
  try {
    const { factoryId } = req.body;
    if (!factoryId)
      return res.status(400).json({ error: "factoryId is required" });

    const existingProduct = await Product.findOne({ factoryId });
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
    res.status(201).json({ message: "Product created", product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Server error while creating product" });
  }
};

module.exports.AddIdToProduct = async (req, res) => {
  try {
    const { factoryId: newFactoryId, quantity } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    const conflict = await Product.findOne({
      _id: { $ne: req.params.id },
      factoryId: newFactoryId,
    });
    if (conflict) {
      return res.status(400).json({
        error: "This factory ID already exists in another product",
        conflictProductId: conflict._id,
      });
    }

    if (product.factoryId.includes(newFactoryId)) {
      return res
        .status(200)
        .json({ message: "ID already exists in this product" });
    }

    product.factoryId.push(newFactoryId);
    product.quantity += quantity || 0;
    await product.save();

    res.status(200).json({ message: "ID added to product", product });
  } catch (error) {
    console.error("Error adding factoryId:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.UpdateProduct = async (req, res) => {
  try {
    const updateData = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct)
      return res.status(404).json({ message: "Product not found" });

    if (req.file) {
      if (updatedProduct.images.length > 0) {
        try {
          await cloudinary.uploader.destroy(updatedProduct.images[0].filename);
        } catch (cloudError) {
          console.error(
            "Error deleting old image from Cloudinary:",
            cloudError
          );
        }
      }
      updatedProduct.images = [
        { url: req.file.path, filename: req.file.filename },
      ];
    }

    await updatedProduct.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.UpdateProductByFactoryid = async (req, res) => {
  try {
    const { factoryId } = req.params;
    const updateData = req.body;

    const updatedProduct = await Product.findOneAndUpdate(
      { factoryId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct)
      return res.status(404).json({ message: "Product not found" });

    if (req.file) {
      if (updatedProduct.images.length > 0) {
        try {
          await cloudinary.uploader.destroy(updatedProduct.images[0].filename);
        } catch (cloudError) {
          console.error(
            "Error deleting old image from Cloudinary:",
            cloudError
          );
        }
      }
      updatedProduct.images = [
        { url: req.file.path, filename: req.file.filename },
      ];
    }

    await updatedProduct.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product by factory ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.DeleteProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    if (product.images.length) {
      try {
        await cloudinary.uploader.destroy(product.images[0].filename);
      } catch (cloudError) {
        console.error("Error deleting image from Cloudinary:", cloudError);
      }
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.AddToProduct = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0)
      return res.status(400).json({ error: "Invalid quantity" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.quantity += quantity;
    await product.save();

    res.status(200).json(product);
  } catch (error) {
    console.error("Error adding quantity:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.AddToProductByFactoryId = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0)
      return res.status(400).json({ error: "Invalid quantity" });

    const product = await Product.findOne({ factoryId: req.params.factoryId });
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.quantity += quantity;
    await product.save();

    res.status(200).json(product);
  } catch (error) {
    console.error("Error adding quantity by factory ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.searchProductsByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name)
      return res.status(400).json({ error: "Missing name query parameter" });

    const products = await Product.find({
      name: { $regex: name, $options: "i" },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.GetGroupByFactoryId = async (req, res) => {
  try {
    const group = await Product.find({ factoryId: req.params.factoryId });
    if (!group.length)
      return res.status(404).json({ error: "No products found" });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.RemoveFactoryIdFromProduct = async (req, res) => {
  try {
    const { factoryId } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    if (!product.factoryId.includes(factoryId)) {
      return res
        .status(404)
        .json({ error: "Factory ID not found in this product" });
    }

    product.factoryId = product.factoryId.filter((id) => id !== factoryId);
    await product.save();

    res.status(200).json({ message: "Factory ID removed from product" });
  } catch (error) {
    console.error("Error removing factory ID:", error);
    res.status(500).json({ error: "Server error" });
  }
};
