const AWS = require("aws-sdk");
const nodemailer = require('nodemailer');

const SESConfig = {
  apiVersion: "2010-12-01",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.REGION,
};

const sendEmail = async (options) => {
  var params = {
    Source: "no-reply@easy-paies.fr",
    Destination: {
      ToAddresses: [`${options.email}`],
    },
    ReplyToAddresses: [`${options.replyTo}`],
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: options.message,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: options.subject,
      },
    }, 
  };
  try {
    await new AWS.SES(SESConfig)
      .sendEmail(params)
      .promise()
      .then((res) => {
        console.log(res);
      });
  } catch (e) {
    console.log(e);
  }
};

const sendEmailWithAttachment = async (options) => {
  const transporter = nodemailer.createTransport({
    SES: new AWS.SES(SESConfig)
  });

  var mailOptions = {
    from: 'no-reply@easy-paies.fr',
    subject: options.subject,
    html: options.message,
    to: options.email,
    attachments: options.attachments
  };

  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err);
      console.log('Error sending email');
    } else {
      console.log('Email sent successfully');
    }
  });
}

module.exports = {
  sendEmail,
  sendEmailWithAttachment,
};
