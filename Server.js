// Env
require('dotenv').config()

// Modules
const { Sequelize } = require('sequelize')
// const { performance } = require('perf_hooks')

// Models
const Target = require('./models/Target')
const Topic = require('./models/Topic')
const Notification = require('./models/Notification')
const NotificationStatus = require('./models/NotificationStatus')

let Models = {
    Target,
    Topic,
    Notification,
    NotificationStatus
}

// Configs
const MAIN = require('./config/main')

// Performance
let perf;

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

        // Stores
        FK_Store = [];

        console.log("⬜ Loading models...")
        await Promise.all(
            Object.keys(Models)
                .map(async name => {
                    // Init model
                    console.log(`⬛ ${name}`)
                    const model = await Models[name](DB)

                    // Store Foreign Key fn if exists
                    if(typeof Models[name].FK == "function") FK_Store.push( Models[name].FK )

                    // Store inited model
                    Models[name] = model

                    // Return awaited model
                    return model
                })
            )
        console.log("🟩 Done!\n")

        console.log("⬜ Loading Foreign Keys...")
        FK_Store.forEach(fn => fn(Models))
        console.log("🟩 Done!\n")



        console.log("⬜ Syncing models...")
        await DB.sync({ force: MAIN.DEVELOPMENT })
        console.log("🟩 Done!\n")

        // console.log("⬜ Building test notification...")
        // const notif = DB.models.notification.prepare({
        //     // Notification contents
        //     owner: "c1c5aa34-9c93-4d96-a635-d4a97692a611",
        //     slug: "TEST/EVENT/TYPE",
        //     version: "0.1.0"
        // })
        // console.log(notif.toJSON())
        // console.log("🟩 Done!\n")

        


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