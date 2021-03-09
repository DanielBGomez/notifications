// Env
require('dotenv').config()

// Modules
const { Sequelize } = require('sequelize')

// Models
const Target = require('./models/Target')
const Notification = require('./models/Notification')

;
// Execs
(async () => {
    console.log("\n⬜ Creating DB Connection...")
    const DB = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT
    })
    console.log(`🟩 ${ process.env.DB_USER }@${ process.env.DB_HOST }\n`)

    try {
        console.log("⬜ Testing connection...");
        await DB.authenticate()
        console.log("🟩 Connected!\n")

        console.log("⬜ Syncing models...")

        console.log("⬛ 'Target' model")
        await Target(DB).sync()
        console.log("🟩 Done\n")

        console.log("⬛ 'Notification' model")
        await Notification(DB).sync()
        console.log("🟩 Done\n")


    } catch(err) {
        console.log(`\n`)
        console.log(err)
        process.exit()
    }
})()

console.log