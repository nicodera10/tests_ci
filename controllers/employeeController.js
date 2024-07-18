const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");

const Employee = require("../models/employeeModel");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");
const {sendEmail} = require("../utils/email");
const { options } = require("../routes/employeeRoutes");
const Management = require("../models/managementModel");
const { contentSecurityPolicy } = require("helmet");

const s3 = new aws.S3();
const uploadS3 = multer({
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
      cb(null, `${req.params.id}/${uuidv4()}.${ext}`);
    },
  }),
  limits: { fileSize: 10000000 }, //10 MB max
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype.startsWith("image") ||
      file.mimetype == "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

exports.uploadEmployeesDocs = uploadS3.array("docs", 10);

exports.createEmployee = catchAsync(async (req, res, next) => {
  //console.log(req.files);
  const files = req.files;
  const filesKeys = [];
  files.forEach((file) => {
    filesKeys.push(`<br/> https://docs.easy-paies.fr/${file.key}`);
  });
  var htmlFileKeys = filesKeys.forEach((fileKey) => {
    return `<br/> ${fileKey}`;
  });

  const data = JSON.parse(req.body.data);

  var doc = await Employee.create({
    civilite: data.civilite,
    lastName: data.lastName,
    maidenName: data.maidenName,
    firstName: data.firstName,
    birthDate: data.birthDate,
    country: data.country,
    county: data.county,
    ssNumber: data.ssNumber,
    houseNumber: data.houseNumber,
    street: data.street,
    addressSupplement: data.addressSupplement,
    zipCode: data.zipCode,
    city: data.city,
    mail: data.mail,
    reason: data.reason,
    contractType: data.contractType,
    cddType: data.cddType,
    dateSigned: data.dateSigned,
    dateBegin: data.dateBegin,
    dateEnd: data.dateEnd,
    trialPeriod: data.trialPeriod,
    weaklyTime: data.weeklyTime,
    drawUp: data.drawUp,
    positionName: data.positionName,
    isExecutive: data.isExecutive,
    classification: data.classification,
    // hourlyRate: data.hourlyRate,
    salary: data.salary,
    salaryValue: data.salaryValue,
    monthlyPremium: data.monthlyPremium,
    premiumType: data.premiumType,
    advantages: data.advantages,
    advantageType: data.advantageType,
    iban: data.iban,
    bic: data.bic,
    mondayMorning: data.mondayMorning,
    mondayAfternoon: data.mondayAfternoon,
    tuesdayMorning: data.tuesdayMorning,
    tuesdayAfternoon: data.tuesdayAfternoon,
    wenesdayMorning: data.wenesdayMorning,
    wenesdayAfternoon: data.wenesdayAfternoon,
    thursdayMorning: data.thursdayMorning,
    thursdayAfternoon: data.thursdayAfternoon,
    fridayMorning: data.fridayMorning,
    fridayAfternoon: data.fridayAfternoon,
    saturdayMorning: data.saturdayMorning,
    saturdayAfternoon: data.saturdayAfternoon,
    sundayMorning: data.sundayMorning,
    sundayAfternoon: data.sundayAfternoon,
    healthContract: data.healthContract,
    alsaceMoselle: data.alsaceMoselle,
    comment: data.comment,
    entity: req.params.id,
    docs: filesKeys,
  });
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  } else {
    await sendEmail({
      email: `${data.mailTo}`,
      subject: `Nouvelle fiche employé pour ${data.entityName}`,
      replyTo: `${data.mailTo}`,
      message: `Bonjour,
    <br/><br/> Un nouvel employé a été ajouté pour ${data.entityName}
    <br/><br/> Voici les informations le concernant
    <br/><br/>Civilite : ${data.civilite},
    <br/> Nom : ${data.lastName},
    <br/> Nom de jeune fille : ${data.maidenName},
    <br/> Prénom : ${data.firstName},
    <br/> Date de naissance : ${data.birthDate},
    <br/> Pays de naissance : ${data.country},
    <br/> Département de naissance : ${data.county},
    <br/> Numéro de sécurité sociale : ${data.ssNumber},
    <br/> Adresse : ${data.houseNumber} ${data.street} ${data.zipCode} ${
        data.city
      },
    <br/> Complément d'adresse : ${data.addressSupplement},
    <br/> Mail : ${data.mail},
    <br/> Motif d'embauche: ${data.reason},
    <br/> Type de contrat: ${data.contractType},
    <br/> Type de Cdd: ${data.cddType},
    <br/> Date de signature: ${data.dateSigned},
    <br/> Date de début de contrat: ${data.dateBegin},
    <br/> Date de fin de contrat: ${data.dateEnd},
    <br/> Durée de la période d'essai (jours): ${data.trialPeriod},
    <br/> Durée du temps de travail hebdomadaire : ${data.weeklyTime},
    <br/> Contrat de travail a établir : ${data.drawUp},
    <br/> Dénomination du poste : ${data.positionName},
    <br/> Catégorie : ${data.isExecutive},
    <br/> Classification : ${data.classification},
    <br/> Prime mensuelles hors convention collectives : ${data.monthlyPremium},
    <br/> Type de prime : ${data.premiumType},
    <br/> Avantages : ${data.advantages},
    <br/> Type d'avantages : ${data.advantageType},
    <br/> Iban : ${data.iban},
    <br/> Bic : ${data.bic},
    <br/> Lundi matin : ${data.mondayMorning},
    <br/> Lundi soir : ${data.mondayAfternoon},
    <br/> Mardi matin : ${data.tuesdayMorning},
    <br/> Mardi soir : ${data.tuesdayAfternoon},
    <br/> Merdredi matin : ${data.wenesdayMorning},
    <br/> Mercredi soir : ${data.wenesdayAfternoon},
    <br/> Jeudi matin : ${data.thursdayMorning},
    <br/> Jeudi soir : ${data.thursdayAfternoon},
    <br/> Vendredi matin : ${data.fridayMorning},
    <br/> Vendredi soir : ${data.fridayAfternoon},
    <br/> Samedi matin : ${data.saturdayMorning},
    <br/> Samedi soir : ${data.saturdayAfternoon},
    <br/> Dimanche matin : ${data.sundayMorning},
    <br/> Dimanche soir : ${data.sundayAfternoon},
    <br/> Type de contrat de frais santé : ${data.healthContract},
    <br/> Alsace-Moselle : ${data.alsaceMoselle},
    <br/><br/> Commentaire : ${data.comment},
    <br/> Documents : ${filesKeys.toString()},
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
    });
    await Management.findByIdAndUpdate(
      data.managementId,
      {
        $inc: { newEmployee: 1 },
      },
      { new: true }
    );
    res.status(201).json({
      status: "success",
      images: req.files.key,
    });
  }
});

exports.getAllEmployees = factory.getAll(Employee);
exports.getOneEmployee = factory.getOne(Employee);
exports.deleteEmployee = factory.deleteOne(Employee);

//exports.createEmployee = catchAsync(async (req, res, next) => {
//  console.log(req.body.images);
//  res.status(201).json({
//    status: 'success',
//    images: images
//  });
//  //const doc = await Employee.create(req.body);
//  //if (doc && req.body.sendNotif != null && req.body.type == 'event') {
//  //  await sendNotification({
//  //    title: 'Nouvelle event dans votre école !',
//  //    topic: req.body.sendNotif,
//  //    body: `Une nouvelle event de ${req.body.name} a été postée dans votre école.`,
//  //  });
//  //}
//});
exports.updateEmployee = catchAsync(async (req, res, next) => {
  const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  await sendEmail({
    email: `${req.body.mailTo}`,
    subject: `Nouveau départ employé pour ${req.body.entityName}`,
    replyTo: `${req.body.mailTo}`,
    message: `Bonjour,
    <br/><br/> Un nouveau départ employé a été saisi pour ${req.body.entityName}
    <br/><br/> Voici les informations :
    <br/><br/>Employé : ${doc.firstName} ${doc.lastName},
    <br/>Numéro SS : ${doc.ssNumber},
    <br/>Type de sortie : ${req.body.departureType},
    <br/>Date de sortie : ${req.body.departureDate},
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
  });
  await Management.findByIdAndUpdate(
    req.body.managementId,
    {
      $inc: { remove: 1 },
    },
    { new: true }
  );
  res.status(200).json({
    status: "success",
  });
});
exports.declareAbs = catchAsync(async (req, res, next) => {
  const doc = await Employee.findById(req.params.id);
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  const files = req.files;
  const filesKeys = [];
  files.forEach((file) => {
    filesKeys.push(`<br/> https://docs.easy-paies.fr/${file.key}`);
  });
  var htmlFileKeys = filesKeys.forEach((fileKey) => {
    return `<br/> ${fileKey}`;
  });

  const data = JSON.parse(req.body.data);

  console.log(filesKeys.toString());

  await sendEmail({
    email: `${data.mailTo}`,
    subject: `Nouvelle absence pour ${data.entityName}`,
    replyTo: `${data.mailTo}`,
    message: `Bonjour,
    <br/><br/> Une nouvelle absence employé a été saisie pour ${data.entityName}
    <br/><br/> Voici les informations :
    <br/><br/>Employé : ${doc.firstName} ${doc.lastName},
    <br/>Numéro SS : ${doc.ssNumber},
    <br/>Type d'absence : ${data.absenceType},
    <br/>Date de début : ${data.beginDate},
    <br/>Date de fin : ${data.endDate},
    <br/> Justificatif : ${filesKeys.toString()},
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
  });
  await Management.findByIdAndUpdate(
    req.body.managementId,
    {
      $inc: { absence: 1 },
    },
    { new: true }
  );
  res.status(200).json({
    status: "success",
  });
});
exports.salaryValidation = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Employee.find({
      _id: {
        $in: req.body.id,
      },
    }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // const doc = await features.query.explain();
  const doc = await features.query;

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  const employees = [];
  doc.forEach((el) => {
    employees.push(
      `<br/> - ${el.firstName} ${el.lastName} N° sécurité sociale : ${el.ssNumber}`
    );
  });
  const values = `<br/>- ${req.body.validations[0]} : ${req.body.validations[1]}`;
  // req.body.validations.forEach((el) => {
  //   values.push(`<br/>- ${el[0]} : ${el[1]}`);
  // });

  await sendEmail({
    email: `${req.body.mailTo}`,
    subject: `Validation de salaire pour ${req.body.entityName}`,
    replyTo: `${req.body.mailTo}`,
    message: `Bonjour,
    <br/><br/> Une nouvelle validation de salaire a été saisie pour ${req.body.entityName}
    <br/><br/> Voici les informations :
    <br/><br/>Employé(s) :
    <br/> ${employees}
    <br/><br/> Validations :
    <br/>${values}
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
  });
  res.status(200).json({ status: "success", data: doc });
});

exports.createEmployeeShort = catchAsync(async (req, res, next) => {
  console.log(req.body)
  const data = req.body;

  var doc = await Employee.create({
    lastName: data.lastName,
    firstName: data.firstName,
    matricule: data.matricule,
    entity: data.entity,
  });
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  } else {
    res.status(201).json({
      status: "success",
    });
  }
});
