const Joi = require("joi");

// Define the Joi schema
const productSchema = Joi.object({
  name: Joi.string().required(),
  factoryId: Joi.string().optional(),
  price: Joi.number().min(0).required(),
  expectedSoldAt: Joi.number().min(0).required(),
  quantity: Joi.number().min(0).required(), // Ensures quantity cannot be negative
});

// Middleware for validating product creation
const validateProduct = (req, res, next) => {
  // Validate only `req.body` (multer parses form fields into `req.body`)
  console.log(req.body);
  const { error } = productSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message + " (validation error)" });
  }

  next();
};

module.exports.validateProduct = validateProduct;
