// Modules
const { Sequelize, DataTypes, Model } = require('sequelize')

// Enums
const STATUS = require('./NotificationStatus').STATUS

// Configs
const NOTIFICATIONS = require('../config/notifications')

/**
 * Notification Model
 * 
 * @type Model
 * @version 0.2.0
 * @author Daniel B Gómez <contact@danielbgomez.com>
 */
class Notification extends Model {
    /**
     * 
     * @param {*} param0 
     */
    static prepare({ uuid, owner, category, topic, slug, message, payload = {}, status }){
        // Validations
        if(!slug) throw { err: "NO_SLUG_PROVIDED", msg: "The slug param is required", data: {} }
        if(typeof payload != "object") throw { err: "INVALID_PAYLOAD", msg: "The payload must be an object", data: { payload } }

        // Has default values?
        let NOTIF_DATA = NOTIFICATIONS;
        // Split slug by slash and find in config object.
        const notFound = slug.split("/").some(key => {
            /**
             * The slash represents a namespace, that's why the loop is
             * recursive within the prev object.
             * 
             * If the current key is not found, it means the target slug
             * doesn't exists in the config.
             */
            NOTIF_DATA = NOTIF_DATA[key]
            if(typeof NOTIF_DATA != "object") return true
        })
        // If found, use config values as default values
        if(!notFound){
            // Parse message
            if(!message) message = NOTIF_DATA.BRIEF
        }

        // Sanitize payload
        payload = JSON.stringify(payload)

        // Create instance
        return Notification.build({ uuid, owner, category, topic, slug, message, payload, status })
    }

}

/**
 * Initialize the notification model
 * 
 * @param {Sequelize} db Connection instance
 * @returns Notification Model
 */
module.exports = sequelize => Notification.init({
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    uuid: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.STRING
    },
    owner: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false,
    },  
    payload: {
        type: DataTypes.TEXT
    }
}, {
    sequelize,
    modelName: "notification",

    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated',

    indexes: [
        { name: "category", using: "BTREE", fields: [ 'category' ] },
        { name: "owner", using: "BTREE", fields: [ 'owner' ] },
        { name: "slug", using: "BTREE", fields: [ 'slug' ] }
    ]
})

/**
 * Foreing keys handler
 */
module.exports.FK = ({ Notification, Topic }) => {
    // Topic
    Topic.hasMany(Notification)
    Notification.belongsTo(Topic, {
        foreignKey: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true
        }
    })
}

// ENUMS Exports
module.exports.STATUS = STATUS