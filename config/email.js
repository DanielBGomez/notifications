/**
 * Email controller configs
 * 
 * @see https://dev.mailjet.com/email/guides/#getting-started
 */
module.exports = {
    VERSION: process.env.MAILJET_VERSION,
    API_KEY: process.env.MAILJET_APIKEY,
    SECRET_KEY: process.env.MAILJET_SECRETKEY,
    SERVER_EMAIL_ADDRESS: process.env.MAILJET_SERVER_EMAIL,
    SERVER_NAME: process.env.MAILJET_SERVER_NAME,
    TEST_EMAIL_RECEIVER: process.env.MAILJET_DEFAULT_EMAIL,
    DEFAULT_TEMPLATE_ID: process.env.MAILJET_DEFAULT_TEMPLATE 
}