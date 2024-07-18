const AWS = require("aws-sdk");
const nodemailer = require('nodemailer');

const SESConfig = {
  apiVersion: "2010-12-01",
  accesKeyId: process.env.AWS_ACCESS_KEY_ID,
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
    res.status(400).json({
      status: "error",
      message: "Something went wrong !",
    });
  }
};

const sendEmailWithAttachment = async (options) => {
  const transporter = nodemailer.createTransport({
    SES: new AWS.SES(SESConfig)
  });

  var mailOptions = {
    from: 'no-reply@easy-paies.fr',
    subject: options.subject,
    html: options.body,
    to: options.email,
    attachments: options.attachments
    // [
    //   {
    //     filename: "file.csv",
    //     content: `John,Doe,120 jefferson st.,Riverside, NJ, 08075
    //     Jack,McGinnis,220 hobo Av.,Phila, PA,09119
    //     "John ""Da Man""",Repici,120 Jefferson St.,Riverside, NJ,08075
    //     Stephen,Tyler,"7452 Terrace ""At the Plaza"" road",SomeTown,SD, 91234
    //     ,Blankman,,SomeTown, SD, 00298
    //     "Joan ""the bone"", Anne",Jet,"9th, at Terrace plc",Desert City,CO,00123
    //     `
    //   }
    // ]
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
