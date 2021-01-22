const cron = require('node-cron');
const https = require('https');
const logger = require('./logger').logger;
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromMobileNumber = process.env.FROM_MOBILE_NUMBER;
const toMobileNumber = process.env.TO_MOBILE_NUMBER;

const emailID = process.env.EMAIL_ID
const password = process.env.EMAIL_PASSWORD
const toEmail = process.env.TO_EMAIL_ID

const uscisLink = "https://my.uscis.gov/appointmentscheduler-appointment/ca/en/office-search"

function job() {
    logger.info(`Running New job`)
    const options = {
        hostname: 'my.uscis.gov',
        port: 443,
        path: '/appointmentscheduler-appointment/field-offices/state/OH',
        method: 'GET'
    }

    const req = https.request(options, res => {
        res.setEncoding('utf8');

        res.on('data', data => {
            logger.info(`Response received`)
            const cincyInfo = (JSON.parse(data)).filter(info => info.description === 'USCIS CINCINNATI')[0]

            if (cincyInfo.timeSlots && cincyInfo.timeSlots.length !== 0) {
                logger.info(`Time slots are ${cincyInfo.timeSlots}`)

                // Send mobile message
                const client = new twilio(accountSid, authToken);

                client.messages.create({
                    body: `Seems USCIS appointments are open, visit ${uscisLink} for more info.`,
                    to: toMobileNumber,
                    from: fromMobileNumber
                })
                .then((message) => logger.info(`Message is ${message.status}`))
                .catch((error) => {
                    logger.error(`Error occured when sending sms ${error}`)
                })

                // Send email
                const smtpConfig = {
                    service: 'gmail',
                    auth: {
                        user: emailID,
                        pass: password
                    }
                }

                var transporter = nodemailer.createTransport(smtpTransport(smtpConfig));
                var mailOptions = {
                    from: emailID,
                    to: toEmail,
                    subject: "USCIS Cincinnati Apppointments Update",
                    text: `Seems USCIS appointments are open, visit ${uscisLink} for more info.`
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        logger.error(`Error Occured when sending email: ${Error}`)
                    } else {
                        logger.info(`Email Sent`)
                    }
                })
            }
        })
    })

    req.on('error', error => {
        logger.error(error)
    })

    req.end()
}

// runs every one hour
cron.schedule('0 0 */1 * * *', job);
