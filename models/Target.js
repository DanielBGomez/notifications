// Modules
const { Sequelize, DataTypes, Model } = require('sequelize')
const Validator = require('validator')

// Enums
const METHODS = [
    'PHONE',
    'EMAIL',
    'ANDROID_DEVICE',
    'IOS_DEVICE'
]
const STATUS = {
    '-1': 'ARCHIVED',
    '0': 'UNVERIFIED',
    '1': 'VERIFIED',
}

/**
 * Target Model
 * 
 * @type Model
 * @version 0.1.0
 * @author Daniel B Gómez <contact@danielbgomez.com>
 */
class Target extends Model {}

/**
 * 
 * @param {Sequelize} db Connection instance
 * @returns Model
 */
module.exports = sequelize => Target.init({
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
    method: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: METHODS
    },
    identifier: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isValid(value){
                switch(this.method){
                    case 'PHONE':
                        return Validator.isMobilePhone(value, process.env.PHONE_VALIDATOR_LOCALE, { strictMode: true })
                    case 'EMAIL':
                        return Validator.isEmail(value)
                    case 'IOS_DEVICE':
                        return /^[0-9a-fA-F]{64}$/.test(value)
                    default:
                        return typeof value == 'string'
                }
            }
        }
    },
    owner: {
        type: DataTypes.UUID,
        allowNull: false
    },
    status: {
        type: DataTypes.TINYINT(1),
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: "target",

    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated',

    indexes: [
        { name: "target_owner-method", using: "BTREE", fields: [ 'owner', 'method' ] },
        // { name: "target_value", using: "BTREE", fields: [ 'value' ] },
        { name: "target_method", using: "BTREE", fields: [ 'method' ] },
        { name: "target_owner", using: "BTREE", fields: [ 'owner' ] },
        { name: "target_status", using: "BTREE", fields: [ 'status' ] }
    ]
})

// ENUMS Exports
module.exports.METHODS = METHODS
module.exports.STATUS = STATUS