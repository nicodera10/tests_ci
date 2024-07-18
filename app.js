const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
//const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const moment = require("moment-timezone");
const cors = require("cors");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const userRouter = require("./routes/userRoutes");
const managementsRouter = require("./routes/managementRoutes");
const contactRouter = require("./routes/contactRoutes");
const entitiesRouter = require("./routes/entityRoutes");
const employeesRouter = require("./routes/employeeRoutes");
const ressourcesRouter = require("./routes/ressourceRoutes");
const formEmployeesRouter = require("./routes/formEmployeeRoutes");

const app = express();

//const server = require("http").Server(app);

moment.tz("Europe/Paris").format();
// Set security HTTP headers
app.use(helmet());
app.use(cors());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// Limit requests from same API
const limiter = rateLimit({
  max: 10000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
const blockLimiter = rateLimit({
  max: 0,
  windowMs: 60 * 60 * 1000,
  message: "request not allowed",
});
app.use("/api", limiter);
// Body parser, reading data from body into req.body
app.use(express.json({ limit: "20mb" }));
// Data sanitization against XSS
app.use(xss());
// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      //'duration',
    ],
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ status: "success" });
});
app.use("/api/v1/users", userRouter);
app.use("/api/v1/managements", managementsRouter);
app.use("/api/v1/entities", entitiesRouter);
app.use("/api/v1/employees", employeesRouter);
app.use("/api/v1/formemployees", formEmployeesRouter);
app.use("/api/v1/contact", contactRouter);
app.use("/api/v1/ressources", ressourcesRouter);
app.use("/__webpack_hmr/client", blockLimiter);
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
