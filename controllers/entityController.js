const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");

const Entity = require("../models/entityModel");
const Employee = require("../models/employeeModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const { sendEmail, sendEmailWithAttachment } = require("../utils/email");
const Management = require("../models/managementModel");
const User = require("../models/userModel");
const ObjectId = require("mongoose").Types.ObjectId;
const csv = require("../lib/buildCsv");
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
      cb(null, `${req.params.id}/informations.${ext}`);
    },
  }),
  limits: { fileSize: 10000000 }, //10 MB max
  fileFilter: function (req, file, cb) {
    if (file.mimetype == "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});
exports.updateEntityInformations = upload.single("informations");

exports.getAllEntities = factory.getAll(Entity, "management");
exports.getOneEntity = factory.getOne(Entity, "management");
exports.createEntity = factory.createOne(Entity);

exports.deleteEntity = catchAsync(async (req, res, next) => {
  const doc = await Entity.findByIdAndDelete(req.params.id);
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  
  try {
    await User.deleteMany({ customerOf: ObjectId(req.params.id) });
  } catch (err) {
    console.log(err);
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.updateEntity = catchAsync(async (req, res, next) => {
  if (req.file)
    req.body.informations = `https://docs.easy-paies.fr/${req.file.key}`;
  const doc = await Entity.findByIdAndUpdate(req.params.id, req.body, {
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

const uploadContact = multer({
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
      cb(null, `contact/${uuidv4()}.${ext}`);
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

exports.uploadContactDocs = uploadContact.array("docs", 10);

exports.contact = catchAsync(async (req, res, next) => {
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
  console.log(data)

  await sendEmail({
    email: `${data.mailTo}`,
    subject: `Nouveau message de ${data.entityName}`,
    replyTo: `${data.mailTo}`,
    message: `Bonjour,
    <br/><br/> un nouveau message de ${data.entityName} vient d'être envoyé
    <br/><br/> Voici le message :
    <br/><br/> ${data.message};
    <br/> documents : ${filesKeys.toString()},
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
  });
  const doc = await Management.findByIdAndUpdate(
    req.body.managementId,
    {
      $inc: { contact: 1 },
    },
    { new: true }
  );
  res.status(200).json({
    status: "success",
  });
});

exports.addSalaryElements = catchAsync(async (req, res, next) => {
  const entityId = req.params.id;
  const salaryElements = req.body.salaryElements;
  const company = await Entity.findById(entityId);
  const employees = await Employee.find({ entity: entityId });
  let bodyEmail = [];

  let entryPrime = company.entryPrime || [];
  for (element of salaryElements) {
    for (employee of employees) {
      if(!element.employeesId.includes(employee.id)) continue;
      entryPrime.push({
        code: element.key,
        matricule: employee.matricule,
        value: parseFloat(element.value),
      });
      bodyEmail += "<br/><br/> - " + employee.firstName + " " + employee.lastName + " matricule : " + employee.matricule;
      bodyEmail += "<br/>   code : " + element.key + ", valeur : " + element.value;
    }
  };

  await Entity.updateOne({ _id: entityId },
    {entryPrime: entryPrime}
  );

  await sendEmail({
    email: req.body.mailTo,
    subject: `Validation de salaire pour ${req.body.entityName}`,
    replyTo: req.body.mailTo,
    message: `Bonjour,
    <br/><br/> Une nouvelle validation de salaire a été saisie pour ${req.body.entityName}
    <br/><br/> Voici les informations :
    ${bodyEmail}
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
  });

  // const msg = {
  //   to: req.body.mailTo,
  //   from: 'contact@easy-paies.fr',
  //   templateId: 'd-7e15d5b523a04deab9dbd45ea33f8eab',
  //   dynamicTemplateData: {
  //     entityName: req.body.entityName,
  //     bodyEmail: bodyEmail,
  //   },
  // };
  // sgMail.send(msg);

  res.status(200).json({ 
    status: "success",
  });
});

const uploadAbsence = multer({
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
      cb(null, `${req.params.id}/absences/${uuidv4()}.${ext}`);
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

exports.uploadAbsenceDocs = uploadAbsence.array("docs", 10);

exports.addAbsence = catchAsync(async (req, res, next) => {
  const entityId = req.params.id;
  const data = JSON.parse(req.body.data);
  console.log('Request data:', data);

  let employee;
  let user;
  let employer;

  // Chercher l'utilisateur par ID
  try {
    user = await User.findById(data.employeeId);
  } catch (error) {
    console.error('Error finding user:', error);
  }

  if (user) {
    // Récupérer l'ID de l'employé référencé dans l'utilisateur, si le rôle est "employee"
    if (user.role === 'employee') {
      const employeeId = user.employeeId;
      if (!employeeId) {
        console.log('No employee reference found in user');
        return next(new AppError("No employee reference found in user", 404));
      }

      // Chercher l'employé correspondant à l'ID récupéré
      employee = await Employee.findById(employeeId);
      if (!employee) {
        console.log('No employee found with that ID');
        return next(new AppError("No employee found with that ID", 404));
      }

      // Récupérer l'employeur associé en utilisant le champ customerOf
      employer = await User.findOne({ customerOf: user.customerOf, role: 'employer' });
      if (!employer) {
        console.log('No employer found for the employee');
        return next(new AppError("No employer found for the employee", 404));
      }
    } else {
      // Si le rôle est "employer", chercher directement l'employé par l'ID fourni
      employee = await Employee.findById(data.employeeId);
      if (!employee) {
        console.log('No employee found with that ID');
        return next(new AppError("No employee found with that ID", 404));
      }
    }
  } else {
    // Si l'utilisateur n'est pas trouvé, chercher directement dans la collection Employee
    employee = await Employee.findById(data.employeeId);
    if (!employee) {
      console.log('No employee found with that ID');
      return next(new AppError("No employee found with that ID", 404));
    }
  }

  const company = await Entity.findById(entityId);
  let entryAbsence = company.entryAbsence || [];

  const files = req.files;
  const filesKeys = [];
  files.forEach((file) => {
    filesKeys.push(`<br/> https://docs.easy-paies.fr/${file.key}`);
  });
  console.log('Files uploaded:', filesKeys);

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  let startDate = new Date(data.beginDate);
  let endDate = new Date(data.endDate);

  // Ajout de l'absence avec le matricule
  const newAbsence = {
    matricule: employee.matricule, // S'assurer que le matricule est inclus
    code: data.absenceType,
    value: 1,
    startDate: startDate.toLocaleDateString("fr"),
    endDate: endDate.toLocaleDateString("fr"),
  };

  entryAbsence.push(newAbsence);

  try {
    await Entity.updateOne(
      { _id: entityId },
      { $push: { entryAbsence: newAbsence } } // Utilisation de $push pour ajouter à entryAbsence
    );
    console.log('Entity updated with new absence');
  } catch (error) {
    console.error('Error updating entity:', error);
    return next(new AppError('Failed to update entity with absence', 500));
  }

  try {
    // Envoi de l'email à l'unité de gestion de paye
    await sendEmail({
      email: `${data.mailTo}`,
      subject: `Nouvelle absence pour ${data.entityName}`,
      replyTo: `${data.mailTo}`,
      message: `Bonjour,
      <br/><br/> Une nouvelle absence employé a été saisie pour ${data.entityName}
      <br/><br/> Voici les informations :
      <br/><br/>Employé : ${employee.firstName} ${employee.lastName},
      <br/>Matricule : ${employee.matricule},
      <br/>Type d'absence code : ${data.absenceType},
      <br/>Date de début : ${startDate.toLocaleDateString("fr-FR", options)},
      <br/>Date de fin : ${endDate.toLocaleDateString("fr-FR", options)},
      <br/> Justificatif : ${filesKeys.toString()},
      <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
      `,
    });

    // Envoi de l'email à l'employeur
    if (employer) {
      await sendEmail({
        email: employer.email,
        subject: `Nouvelle absence pour ${data.entityName}`,
        replyTo: `${data.mailTo}`,
        message: `Bonjour,
        <br/><br/> Une nouvelle absence employé a été saisie pour ${data.entityName}
        <br/><br/> Voici les informations :
        <br/><br/>Employé : ${employee.firstName} ${employee.lastName},
        <br/>Matricule : ${employee.matricule},
        <br/>Type d'absence code : ${data.absenceType},
        <br/>Date de début : ${startDate.toLocaleDateString("fr-FR", options)},
        <br/>Date de fin : ${endDate.toLocaleDateString("fr-FR", options)},
        <br/> Justificatif : ${filesKeys.toString()},
        <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
        `,
      });
      console.log('Email sent to employer successfully');
    }

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    return next(new AppError('Failed to send email notification', 500));
  }

  res.status(200).json({
    status: "success",
  });
});

exports.generatePaySlips = catchAsync(async (req, res, next) => {
  const doc = await Entity.findById(req.params.id);
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  const contentAbs = csv.buildCsvAbsence(doc.entryAbsence);
  const contentPrime = csv.buildCsvPrime(doc.entryPrime, doc.primes);

  await sendEmailWithAttachment({
    email: doc.management.emailGeneratePaySlip,
    subject: `${doc.name} - Validation génération bulletin`,
    body: `Bonjour,
    <br/><br/> Une nouvelle validation de génération de bulletin a été saisie pour ${doc.name}
    <br/><br/> Vous trouverez en pièce jointe les fichiers de primes et d'absences.
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
    `,
    attachments: [
      {
        filename: "absences.csv",
        content: contentAbs,
      },
      {
        filename: "primes.csv",
        content: contentPrime,
      },
    ],
  });

  await Entity.updateOne({ _id: doc.id },
    { entryAbsence: [], entryPrime: []}
  );

  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});
exports.requestAdvance = async (req, res) => {
  try {
    const { amount, reason, employeeId } = req.body;

    const entity = await Entity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ message: 'Entity not found' });
    }

    entity.entryAdvance.push({ employeeId, amount, reason });
    await entity.save();

    res.status(200).json({ message: 'Advance request added successfully', entity });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error });
  }
};