console.log("🟢 Starting server.js..."); // STARTUP LOG

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

//importing routes
const productsRouter = require("./routes/products");
const UsersRouter = require("./routes/Users");
const TransactionsRouter = require("./routes/transactions");
const FinancesRouter = require("./routes/finances");
console.log("before  Mongo...");

//database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Connection error:", err));

// Optional: Event listeners for the connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log("Database connection is open");
});

const app = express();
console.log("Before trust proxy");

console.log("After trust proxy");

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Middleware for parsing URL-encoded bodies
const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

app.use(limiter);
// Enable Helmet for basic security headers
/*

// Enable CORS for frontend communication
app.use(cors({
  origin: 'http://localhost:3001', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));


*/

//routes
app.use("/products", productsRouter);
app.use("/users", UsersRouter);
app.use("/transactions", TransactionsRouter);
app.use("/finances", FinancesRouter);

app.use((req, res) => {
  res.status(404).send("Route not found");
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(err.message);
  res.status(statusCode).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("MongoDB connection closed due to app termination");
  process.exit(0); // Exit the process with a success code
});
