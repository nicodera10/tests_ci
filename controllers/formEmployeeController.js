const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");

const FormEmployee = require("../models/formEmployeeModel");
const Employee = require("../models/employeeModel");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const {sendEmail} = require("../utils/email");
const Management = require("../models/managementModel");

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

exports.uploadFormEmployeesDocs = uploadS3.array("docs", 10);

exports.createFormEmployee = catchAsync(async (req, res, next) => {
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

  var doc = await FormEmployee.create({
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
    positionName: data.positionName,
    isExecutive: data.isExecutive,
    classification: data.classification,
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
    action: data.action,
    entity: req.params.id,
    docs: filesKeys,
  });
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  } else {
    var message = `Bonjour,
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
    <br/> Dénomination du poste : ${data.positionName},
    <br/> Catégorie : ${data.isExecutive},
    <br/> Classification : ${data.classification},
    <br/> Salaire brut souhaité : `
    if (data.salary != undefined && data.salary == "Autre") {
      message += data.salaryValue ?? ""
    } else {
      message += data.salary ?? ""
    }
    message = message + `,
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
    `

    await sendEmail({
      email: `${data.mailTo}`,
      subject: `Nouvelle fiche employé pour ${data.entityName}`,
      replyTo: `${data.mailTo}`,
      message: message,
    });
    

    res.status(201).json({
      status: "success",
      images: req.files.key,
    });
  }
});

exports.getAllFormEmployees = factory.getAll(FormEmployee);
exports.getOneFormEmployee = factory.getOne(FormEmployee);
exports.deleteFormEmployee = factory.deleteOne(FormEmployee);

exports.updateFormEmployee = catchAsync(async (req, res, next) => {
  let doc = await Employee.findById(req.params.id);
  
  // console.log(req.body);
  
  // console.log(doc);
  // for (var key in req.body) {
  //   doc[key] = req.body[key];
  // }
  
  // console.log(doc);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
  });
});
