const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const {sendEmail, sendEmailWithAttachment} = require("../utils/email");
var generator = require('generate-password');
const Entity = require("../models/entityModel");
const Management = require("../models/managementModel");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signupClient = catchAsync(async (req, res, next) => {
  console.log(req.body)
  const firstName = req.body.firstName.charAt(0).toUpperCase() + req.body.firstName.slice(1);
  const lastName = req.body.lastName.charAt(0).toUpperCase() + req.body.lastName.slice(1);
  const password = generator.generate({
    length: 12,
    numbers: true,
    uppercase: true,
    lowercase: true,
    symbols: false,
    strict : true
  });

  const message = `
Bonjour ${firstName},<br><br>
Bienvenue sur Easy Paies !<br><br>
Vous pouvez vous connecter dès à présent sur l’application en utilisant votre adresse email et le mot de passe suivant :<br><br> 
${password} <br><br>
Lors de votre première connexion, il vous sera demandé de modifier votre mot de passe. <br><br>
A bientôt sur Easy Paies.`;

  await sendEmail({
    email: req.body.email,
    replyTo: "contact@easy-paies.fr",
    subject: "Votre nouveau mot de passe Easy-Paies",
    message,
  });

  const newUser = await User.create({
    firstName: firstName,
    lastName: lastName,
    email: req.body.email,
    password: password,
    customerOf: req.body.customerOf,
    role: req.body.role,
  });
  createSendToken(newUser, 201, res);
});

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName:
      req.body.firstName.charAt(0).toUpperCase() + req.body.firstName.slice(1),
    lastName:
      req.body.lastName.charAt(0).toUpperCase() + req.body.lastName.slice(1),
    email: req.body.email,
    password: req.body.password,
    managerOf: req.body.managerOf,
    role: req.body.role,
    customerOf: req.body.customerOf,
  });
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Email ou mot de passe incorrect", 401));
  }

  // 3) check if entity is not suspended
  const entity = await Entity.findById(user.customerOf);
  if (entity && entity.suspended) {
    return next(new AppError("Votre entreprise a été suspendue", 403));
  }
  const management = await Management.findById(user.managerOf);
  if (management && management.suspended) {
    return next(new AppError("Votre entreprise a été suspendue", 403));
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

exports.initPassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 3) init password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.firstConnection = false;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});
exports.restrictTo = (...roles) => (req, res, next) => {
  // roles ['admin', 'lead-guide']. role='user'
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError("You do not have permission to perform this action", 403)
    );
  }

  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("Cette adresse email n'est pas enregistrée", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  // 3) Send it to user's email
  user.password = resetToken;
  await user.save({ validateBeforeSave: false });
  const message = `Bonjour ${user.firstName}, \n\nVoici votre nouveau mot de passe Easy-Paies : ${resetToken}\n\nVous pourrez le modifier depuis votre compte. `;

  try {
    await sendEmail({
      email: req.body.email,
      replyTo: "contact@easy-paies.fr",
      subject: "Votre nouveau mot de passe Easy-Paies",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.csv = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("Cette adresse email n'est pas enregistrée", 404));
  }

  // // 2) Generate the random reset token
  // const resetToken = user.createPasswordResetToken();

  // // 3) Send it to user's email
  // user.password = resetToken;
  // await user.save({ validateBeforeSave: false });
  const message = `Bonjour ${user.firstName}, \n\nVoici votre nouveau mot de passe Easy-Paies : \n\nVous pourrez le modifier depuis votre compte. `;

  try {
    await sendEmailWithAttachment({
      email: req.body.email,
      replyTo: "contact@easy-paies.fr",
      subject: "Votre nouveau mot de passe Easy-Paies",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    // user.passwordResetToken = undefined;
    // user.passwordResetExpires = undefined;
    // await user.save({ validateBeforeSave: false });
    // console.log(err);
    console.log(err);
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});
