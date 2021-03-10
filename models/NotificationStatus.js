// Modules
const { Sequelize, DataTypes, Model } = require('sequelize')

// Enums
const STATUS = {
    '-1': 'ARCHIVED',
    '0': 'SENT',
    '1': 'READ',
    '2': 'USED'
}

/**
 * NotificationStatus Model
 * 
 * @type Model
 * @version 0.1.0
 * @author Daniel B Gómez <contact@danielbgomez.com>
 */
class NotificationStatus extends Model {}

/**
 * Initialize the notification status model
 * 
 * @param {Sequelize} db Connection instance
 * @returns NotificationStatus Model
 */
module.exports = sequelize => NotificationStatus.init({
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    user: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
    },
    status: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: "notification_status",

    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated',

    indexes: [
        { name: "owner", using: "BTREE", fields: [ 'owner' ] },
        { name: "status", using: "BTREE", fields: [ 'status' ] }
    ]
})

/**
 * Foreing keys handler
 */
module.exports.FK = ({ NotificationStatus, Notification }) => {
    // Notification
    Notification.hasMany(NotificationStatus)
    NotificationStatus.belongsTo(Notification, {
        foreignKey: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true
        }
    })
}

// ENUMS Exports
module.exports.STATUS = STATUS