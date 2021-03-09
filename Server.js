// Env
require('dotenv').config()

// Modules
const { Sequelize } = require('sequelize')
const { performance } = require('perf_hooks')

// Models
const Target = require('./models/Target')
const Notification = require('./models/Notification')

// Performance
let perf = performance.now()

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

        console.log("⬜ Loading models...")

        log("⬛ Target... ")
        await Target(DB)
        log("Ok\n")

        log("⬛ Notification... ")
        await Notification(DB)
        log("Ok\n")

        console.log("🟩 Done!\n")


        console.log("⬜ Syncing models...")
        await DB.sync()
        console.log("🟩 Done!\n")

    } catch(err) {
        console.log(`\n`)
        console.log(err)
        process.exit()
    }
})()


// Use this for "inline" logs
function log(...messages) {
    messages.forEach(msg => {
        process.stdout.write(msg)
    })
}