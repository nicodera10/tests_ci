const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const {sendEmail} = require("../utils/email");

exports.contactForm = catchAsync(async (req, res, next) => {
  await sendEmail({
    email: "contact@easy-paies.fr",
    subject: "Nouveau message depuis easy-paies.fr",
    replyTo: `${req.body.email}`,
    message: `Nom : ${req.body.name}, <br/> Prénom : ${req.body.firstName}, <br/> Numéro de téléphone : ${req.body.phone}, <br/> Nom de l'entreprise : ${req.body.company}, <br/> Nombre d'employés : ${req.body.employees}, <br/> Message : ${req.body.message}, <br/> Accepte les politiques de confidentialité du site https://easy-paies.fr/`,
  });
  res.status(200).json({
    status: "success",
  });
});
