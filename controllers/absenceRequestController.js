const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");

const Employee = require("../models/employeeModel");
const User = require("../models/userModel");
const Entity = require("../models/entityModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { sendEmail } = require("../utils/email");

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
      cb(null, `demandeAbsence/${uuidv4()}.${ext}`);
    },
  }),
  limits: { fileSize: 10000000 }, // 10 MB max
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image") || file.mimetype == "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

exports.uploadAbsenceDocs = uploadS3.array("docs", 10);

const sendEmployeeConfirmation = async (employeeEmail, employeeFirstName, entityName) => {
  const emailSubject = `Votre demande d'absence pour ${entityName} a bien été prise en compte`;
  const emailMessage = `Bonjour ${employeeFirstName},
    <br/><br/> Votre demande d'absence a bien été prise en compte.
    <br/><br/> Vous recevrez une notification dès que votre employeur aura traité votre demande.
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre.
    <br/><br/>Cordialement,
    <br/>L'équipe de gestion des absences
  `;

  await sendEmail({
    email: employeeEmail,
    subject: emailSubject,
    message: emailMessage,
    replyTo: 'no-reply@easy-paies.fr',
  });
};

exports.submitAbsenceRequest = catchAsync(async (req, res, next) => {
  const data = JSON.parse(req.body.data);
  console.log('Received data:', data);

  const user = await User.findById(data.employeeId);
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }
  console.log('Found user:', user);

  const employeeId = user.employeeId;
  if (!employeeId) {
    return next(new AppError("No employee reference found in user", 404));
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return next(new AppError("No employee found with that ID", 404));
  }
  console.log('Found employee:', employee);

  const entityId = employee.entity;
  if (!entityId) {
    return next(new AppError("Employee has no associated entity", 404));
  }

  const entity = await Entity.findById(entityId);
  if (!entity) {
    return next(new AppError("No entity found with that ID", 404));
  }
  console.log('Found entity:', entity);

  const employers = await User.find({ role: 'employer', customerOf: entityId });
  if (!employers.length) {
    return next(new AppError("No employers found for the entity", 404));
  }
  console.log('Found employers:', employers);

  const employerEmails = employers.map(emp => emp.email);

  const files = req.files;
  const filesKeys = files.map(file => `https://docs.easy-paies.fr/${file.key}`);
  console.log('Uploaded files:', filesKeys);

  const absenceRequest = {
    employee: employeeId,
    absenceCode: data.absenceCode,
    absenceName: data.absenceName,
    beginDate: data.beginDate,
    endDate: data.endDate,
    documents: filesKeys,
    status: 'Pending',
    requestDate: Date.now()
  };

  entity.absenceRequests.push(absenceRequest);
  await entity.save();
  console.log('Absence request saved in entity:', entity);

  const emailSubject = `Nouvelle demande d'absence pour ${entity.name}`;
  const emailMessage = `Bonjour,
    <br/><br/> Une nouvelle demande d'absence a été soumise pour ${entity.name}
    <br/><br/> Voici les informations :
    <br/><br/>Employé : ${employee.firstName} ${employee.lastName},
    <br/>Matricule : ${employee.matricule},
    <br/>Type d'absence : ${data.absenceName},
    <br/>Date de début : ${data.beginDate},
    <br/>Date de fin : ${data.endDate},
    <br/> Justificatif : ${filesKeys.map(key => `<a href="${key}">${key}</a>`).join(', ')},
    <br/><br/>Ceci est un message automatique, merci de ne pas y répondre,
  `;

  console.log('Employer Emails:', employerEmails);
  console.log('Email Subject:', emailSubject);
  console.log('Email Message:', emailMessage);

  try {
    for (const email of employerEmails) {
      if (email) { // Vérification que l'email n'est pas indéfini
        await sendEmail({
          email,
          subject: emailSubject,
          replyTo: data.mailTo || 'no-reply@easy-paies.fr',
          message: emailMessage,
        });
      } else {
        console.log('Undefined email detected in employerEmails:', employerEmails);
      }
    }
    console.log('Emails sent successfully');

    await sendEmployeeConfirmation(user.email, employee.firstName, entity.name);
    console.log('Employee confirmation email sent successfully');

    res.status(201).json({
      status: "success",
      data: absenceRequest,
    });

  } catch (error) {
    console.error('Failed to send email notification', error);
    return next(new AppError('Failed to send email notification', 500));
  }
});

exports.manageAbsenceRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const entity = await Entity.findOne({ 'absenceRequests._id': id }).populate('absenceRequests.employee');
  if (!entity) {
    return next(new AppError('Absence request not found', 404));
  }

  const request = entity.absenceRequests.id(id);
  request.status = status;

  const employee = await Employee.findById(request.employee);
  if (!employee) {
    return next(new AppError("Employee not found", 404));
  }

  const user = await User.findOne({ employeeId: employee._id });
  if (!user) {
    return next(new AppError("No user found for the employee", 404));
  }

  const absenceDetails = `
    <br/><br/> Code d'absence : ${request.absenceCode},
    <br/> Type d'absence : ${request.absenceName},
    <br/> Date de début : ${new Date(request.beginDate).toLocaleDateString("fr-FR")},
    <br/> Date de fin : ${new Date(request.endDate).toLocaleDateString("fr-FR")},
    <br/> Justificatif : ${request.documents.map(doc => `<a href="${doc}">${doc}</a>`).join(', ')}
  `;

  if (!user.email) {
    return next(new AppError(`Invalid email address: ${user.email}`, 400));
  }

  if (status === 'Approved') {
    // Ajoutez l'absence à entryAbsence
    entity.entryAbsence.push({
      matricule: employee.matricule,
      code: request.absenceCode,
      value: 1,
      startDate: new Date(request.beginDate).toISOString().split('T')[0],
      endDate: new Date(request.endDate).toISOString().split('T')[0],
    });

    await entity.save();

    const employer = await User.findOne({ customerOf: entity._id, role: 'employer' });

    try {
      // Envoi de l'email à l'unité de gestion de paye
      await sendEmail({
        email: entity.management.emailGeneratePaySlip,
        subject: `Nouvelle absence pour ${entity.name}`,
        replyTo: entity.management.emailGeneratePaySlip,
        message: `Bonjour,
        <br/><br/> Une nouvelle absence employé a été saisie pour ${entity.name}
        <br/><br/> Voici les informations :
        <br/><br/> Employé : ${employee.firstName} ${employee.lastName},
        <br/> Matricule : ${employee.matricule},
        ${absenceDetails}
        <br/><br/> Ceci est un message automatique, merci de ne pas y répondre,
        `,
      });

      // Envoi de l'email à l'employeur
      if (employer && employer.email) {
        await sendEmail({
          email: employer.email,
          subject: `Nouvelle absence validée pour ${entity.name}`,
          replyTo: entity.management.emailGeneratePaySlip,
          message: `Bonjour,
          <br/><br/> Une nouvelle absence employé a été validée pour ${entity.name}
          <br/><br/> Voici les informations :
          <br/><br/> Employé : ${employee.firstName} ${employee.lastName},
          <br/> Matricule : ${employee.matricule},
          ${absenceDetails}
          <br/><br/> Ceci est un message automatique, merci de ne pas y répondre,
          `,
        });
        console.log('Email sent to employer successfully');
      }

      // Envoi de l'email de confirmation à l'employé
      await sendEmail({
        email: user.email,
        subject: `Votre demande d'absence pour ${entity.name} a été acceptée`,
        replyTo: 'no-reply@easy-paies.fr',
        message: `Bonjour ${employee.firstName} ${employee.lastName},
        <br/><br/> Votre demande d'absence pour ${entity.name} a été acceptée.
        <br/><br/> Voici les informations :
        ${absenceDetails}
        <br/><br/> Pour plus d'informations, merci de prendre contact avec votre employeur.
        <br/><br/> Ceci est un message automatique, merci de ne pas y répondre,
        `,
      });
      console.log('Acceptance email sent to employee successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      return next(new AppError('Failed to send email notification', 500));
    }
  } else if (status === 'Rejected') {
    // Envoyer un email de notification de rejet à l'employé
    try {
      await sendEmail({
        email: user.email,
        subject: `Rejet de votre demande d'absence pour ${entity.name}`,
        replyTo: 'no-reply@easy-paies.fr',
        message: `Bonjour ${employee.firstName} ${employee.lastName},
        <br/><br/> Votre demande d'absence pour ${entity.name} a été rejetée.
        <br/><br/> Voici les informations :
        ${absenceDetails}
        <br/><br/> Pour plus d'informations, merci de prendre contact avec votre employeur.
        <br/><br/> Ceci est un message automatique, merci de ne pas y répondre,
        `,
      });
      console.log('Rejection email sent to employee successfully');
    } catch (error) {
      console.error('Error sending rejection email:', error);
      return next(new AppError('Failed to send rejection email notification', 500));
    }
  }

  await entity.save(); // Save entity to update the request status

  res.status(200).json({
    status: 'success',
    data: {
      absenceRequest: request
    }
  });
});

exports.getAllAbsenceRequests = catchAsync(async (req, res, next) => {
  if (!req.user || !req.user.customerOf) {
    return next(new AppError("No user or entity associated with the request", 404));
  }

  const entityId = req.user.customerOf;

  const entity = await Entity.findById(entityId).populate({
    path: 'absenceRequests.employee',
  });

  if (!entity) {
    return next(new AppError('Entity not found', 404));
  }

  res.status(200).json({
    status: "success",
    data: entity.absenceRequests,
  });
});

exports.getAbsenceRequest = catchAsync(async (req, res, next) => {
  const entity = await Entity.findOne({ 'absenceRequests._id': req.params.id }).populate('absenceRequests.employee');
  if (!entity) {
    return next(new AppError("No absence request found with that ID", 404));
  }

  const request = entity.absenceRequests.id(req.params.id);

  res.status(200).json({
    status: "success",
    data: request,
  });
});

exports.updateAbsenceRequest = catchAsync(async (req, res, next) => {
  const entity = await Entity.findOne({ 'absenceRequests._id': req.params.id });
  if (!entity) {
    return next(new AppError("No absence request found with that ID", 404));
  }

  const request = entity.absenceRequests.id(req.params.id);
  Object.assign(request, req.body);
  await entity.save();

  res.status(200).json({
    status: "success",
    data: request,
  });
});

exports.deleteAbsenceRequest = catchAsync(async (req, res, next) => {
  const entity = await Entity.findOne({ 'absenceRequests._id': req.params.id });
  if (!entity) {
    return next(new AppError("No absence request found with that ID", 404));
  }

  const request = entity.absenceRequests.id(req.params.id);
  request.remove();
  await entity.save();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
