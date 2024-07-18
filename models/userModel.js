const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
var generator = require('generate-password');

const userSchema = new mongoose.Schema(
  {
    lastName: {
      type: String,
      required: [true, "Please tell us your lastName!"],
    },
    firstName: {
      type: String,
      required: [true, "Please tell us your FirstName!"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    photo: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin", "manager", "employer", "employee"],
      default: "user",
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    managerOf: {
      type: mongoose.Schema.ObjectId,
      ref: "Management",
    },
    customerOf: {
      type: mongoose.Schema.ObjectId,
      ref: "Entity",
    },
    firstConnection: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    mailValidationToken: String,
    mailValidationExpires: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    qrCode: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const password = generator.generate({
    length: 12,
    numbers: true,
    symbols: true,
    strict : true
  });

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  return password;
};
userSchema.methods.createEmailToken = function () {
  const resetToken = crypto.randomBytes(4).toString("hex");

  this.mailValidationToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //console.log({ resetToken }, this.passwordResetToken);

  this.mailValidationExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
userSchema.pre(/^find/, function (next) {
  this.populate({ path: "managerOf" }).populate({
    path: "customerOf",
    populate: {
      path: "management",
    },
  });
  next();
});
const User = mongoose.model("User", userSchema);

module.exports = User;
