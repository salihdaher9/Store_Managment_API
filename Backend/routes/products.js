const express = require("express");
const Product = require("../models/Product");
const router = express.Router();
const ProductsController = require("../controllers/ProductsController");
const WrapAsync = require("../Middlewear/catchAsync");
const Authinticate = require("../Middlewear/AuthiticateTokenMiddlwear");
const { validateProduct } = require("../Middlewear/ProductSchemaValidation");
const paginatedResults = require("../Middlewear/Paginate");
const multer = require("multer");
const {storage}=require("../cloudinary/index");
const upload = multer({ storage });

router
  .route("/")
  .get(Authinticate,WrapAsync(paginatedResults(Product)), WrapAsync(ProductsController.GetProducts))
  .post(Authinticate,upload.single("image"),WrapAsync(ProductsController.CreateProduct));
  //.post('/products',authenticate,validateProduct,upload.none(),WrapAsync(ProductsController.CreateProduct)  // Your controller logic for creating a product);
  //.post(Authinticate, validateProduct,WrapAsync(ProductsController.CreateProduct));



router.get("/search", Authinticate, WrapAsync(ProductsController.searchProductsByName));


router
  .route("/:id")
  .get(Authinticate, WrapAsync(ProductsController.GetProductById))
  .put(Authinticate,upload.single("image"), WrapAsync(ProductsController.UpdateProduct))
  //.put(Authinticate,WrapAsync(ProductsController.UpdateProduct))

  .delete(Authinticate, WrapAsync(ProductsController.DeleteProduct));

router.put("/:id/increase-quantity",Authinticate,WrapAsync(ProductsController.AddToProduct));
router.put("/:id/add-factory-id", Authinticate, WrapAsync(ProductsController.AddIdToProduct)); // ← new route
router.put("/:id/remove-factory-id", Authinticate, WrapAsync(ProductsController.RemoveFactoryIdFromProduct));

router.put("/Factory/:factoryId",upload.single("image"), WrapAsync(ProductsController.UpdateProductByFactoryid));
router.get("/Factory/:id",Authinticate,WrapAsync(ProductsController.GetProductByFactoryId))
router.put("Factory/:factoryId/increase-quantity",Authinticate,WrapAsync(ProductsController.AddToProductByFactoryId));

module.exports = router;