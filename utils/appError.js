class AppError extends Error {
  constructor(message, statusCode) {
    super();

    this.statusCode = statusCode;
    this.message = message;
    this.name = "AppEror"
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
