const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

const Management = require("../models/managementModel");
const Entity = require("../models/entityModel");
const User = require("../models/userModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");

const s3 = new aws.S3();
const upload = multer({
  storage: multerS3({
    s3: s3,
    storageClass: "INTELLIGENT_TIERING",
    bucket: "easy-paies-docs",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const ext = file.mimetype.split("/")[1];
      cb(null, `${req.params.id}/logo.${ext}`);
    },
  }),
  limits: { fileSize: 10000000 }, //10 MB max
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});
exports.updateManagementLogo = upload.single("logo");

exports.getAllEntities = factory.getAll(Management, "entities");
exports.getOneManagement = factory.getOne(Management);
exports.createManagement = factory.createOne(Management);

exports.deleteManagement = catchAsync(async (req, res, next) => {
  const doc = await Management.findByIdAndDelete(req.params.id);
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  const entities = await Entity.find({ management: req.params.id });

  for (let entity of entities) {
    try {
      await Entity.findByIdAndDelete(entity.id);
      await User.deleteMany({ customerOf: entity.id });
      await User.deleteMany({ managerOf: req.params.id });
    } catch (err) {
      console.log(err);
    }
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.updateManagement = catchAsync(async (req, res, next) => {
  if (req.file) req.body.logo = `https://docs.easy-paies.fr/${req.file.key}`;
  const doc = await Management.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

exports.suspendManagement = catchAsync(async (req, res, next) => {
  const idManagement = req.params.id;
  const entites = await Entity.find({ management: idManagement });
  
  await Management.findByIdAndUpdate(idManagement, { suspended: true });
  for (let entity of entites) {
    try {
      await Entity.findByIdAndUpdate(entity.id, { suspended: true });
    } catch (err) {
      console.log(err);
    }
  }

  res.status(200).json({
    status: "success",
    data: null
  });
});

exports.reactiveManagement = catchAsync(async (req, res, next) => {
  const idManagement = req.params.id;
  const entites = await Entity.find({ management: idManagement });

  await Management.findByIdAndUpdate(idManagement, { suspended: false });
  for (let entity of entites) {
    try {
      await Entity.findByIdAndUpdate(entity.id, { suspended: false });
    } catch (err) {
      console.log(err);
    }
  }

  res.status(200).json({
    status: "success",
    data: null
  });
});
