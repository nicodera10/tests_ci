const User = require("../models/userModel");
const Entity = require("../models/entityModel");
const factory = require("./handlerFactory");
const Management = require("../models/managementModel");
const filterObj = require("../utils/filterObj");

exports.getMe = async (req, res, next) => {
  req.params.id = req.user.id;

  const user = await User.findById(req.params.id);

  // check if user haven't his entity suspended
  const entity = await Entity.findById(user.customerOf);
  if (entity && entity.suspended) {
    return res.status(403).json({
      status: "error",
      message: "Votre entreprise a été suspendue",
    });
  }
  const management = await Management.findById(user.managerOf);
  if (management && management.suspended) {
    return res.status(403).json({
      status: "error",
      message: "Votre entreprise a été suspendue",
    });
  }

  next();
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.updateMe = async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out restricted fields
  const filteredBody = filterObj(req.body, "firstName", "lastName", "email");

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
};
