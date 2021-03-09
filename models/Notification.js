// Modules
const { Sequelize, DataTypes, Model } = require('sequelize')

// Enums
const STATUS = {
    '-1': 'ARCHIVED',
    '0': 'SENT',
    '1': 'RECEIVED',
    '2': 'READ'
}

/**
 * Notification Model
 * 
 * @type Model
 * @version 0.1.0
 * @author Daniel B Gómez <contact@danielbgomez.com>
 */
class Notification extends Model {}

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
    owner: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
    },
    version: {
        type: DataTypes.STRING(10),
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
    },
    status: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: "notification",

    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated',

    indexes: [
        { name: "notification_owner", using: "BTREE", fields: [ 'owner' ] },
        { name: "notification_version", using: "BTREE", fields: [ 'version' ] },
        { name: "notification_slug", using: "BTREE", fields: [ 'slug' ] },
        { name: "notification_status", using: "BTREE", fields: [ 'status' ] }
    ]
})

// ENUMS Exports
module.exports.STATUS = STATUS