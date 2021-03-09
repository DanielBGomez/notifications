/**
 * Send Email controller
 * 
 * @todo Params validation
 * @todo Request error handling
 * 
 * @version 0.1.0
 * @author Daniel B Gómez <contact@danielbgomez.com>
 * 
 * @see https://dev.mailjet.com/email/guides/#getting-started
 */

// Modules
const MailJet = require('node-mailjet')

// Configs
const MAIN = require('../config/main')
const EMAIL = require('../config/email')

/**
 * Send email
 * 
 * @param {object} params 
 * 
 * @param {Boolean|false} params.test
 * 
 * @param {String} params.subject
 * 
 * @param {object} params.from
 * @param {email|SERVER_EMAIL_ADDRESS} params.from.email
 * @param {String|SERVER_NAME} params.from.name
 * 
 * @param {object} params.to
 * @param {email|TEST_EMAIL_RECEIVER} params.to.email
 * @param {String} params.to.name
 * 
 * @param {object} params.vars
 * @param {String|DEFAULT_TEMPLATE_ID} params.template
 * 
 */
module.exports = ({
        test = false,
        subject,
        from = {},
        to = {},
        vars: {},
        template = EMAIL.DEFAULT_TEMPLATE_ID
    }
) => {
    // Connect mailjet sdk
    const mailjet = MailJet.connect( EMAIL.API_KEY, EMAIL.SECRET_KEY )

    // Parse params
    from = { email: EMAIL.SERVER_EMAIL_ADDRESS, name: SERVER_NAME, ...from }
    to = { email: EMAIL.TEST_EMAIL_RECEIVER, ...to }

    // Send email
    return mailjet.post("send", { version: EMAIL.VERSION })
        .request({
            "Messages": [
                {
                    "From": {
                        "Email": from.email,
                        "Name": sender.name
                    },
                    "To": [
                        {
                            "Email": MAIN.DEVELOPMENT || test ? EMAIL.TEST_EMAIL_RECEIVER : to.email,
                            "Name": to.name
                        }
                    ],
                    "TemplateID": template,
                    "TemplateLanguage": true,
                    "Subject": subject,
                    "Variables": vars
                }
            ]
        })
}

// JSDOcs

/**
 * Email address
 * @typedef {String} email
 */
/**
 * Server's contact email address (env)
 * @typedef {email} SERVER_EMAIL_ADDRESS
 */
/**
 * Server's contact name (env)
 * @typedef {email} SERVER_NAME
 */
/**
 * Email address for testing purposes (env)
 * @typedef {email} TEST_EMAIL_RECEIVER
 */
/**
 * Default mailjet template id
 * @typedef {String} DEFAULT_TEMPLATE_ID
 */