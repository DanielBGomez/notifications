// Modules
const { Sequelize, DataTypes, Model } = require('sequelize')

// Enums
const STATUS = {
    '-1': 'ARCHIVED',
    '0': 'MARKETING',
    '1': 'WATCHER'
}

/**
 * Topic Model
 * 
 * @type Model
 * @version 0.1.0
 * @author Daniel B Gómez <contact@danielbgomez.com>
 */
class Topic extends Model {}

/**
 * Initialize the topic model
 * 
 * @param {Sequelize} db Connection instance
 * @returns Topic Model
 */
 module.exports = sequelize => Topic.init({
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
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.TINYINT(1),
        allowNull: false
    }
}, {
    sequelize,
    modelName: "topic",

    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated',

    indexes: [
        { name: "status", using: "BTREE", fields: [ 'status' ] }
    ]
})

// ENUMS Exports
module.exports.STATUS = STATUS