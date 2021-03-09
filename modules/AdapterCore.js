// Modules
const UUID = require('uuid/v4')
const moment = require('moment')

// Local modules
const CDN = require('../../CDN')
const Database = require('../../db/database')
const Validate = require('../../Validate')
const Cache = require('../../Cache')

// Configs
const { enums } = require('../../../config/utils')

/**
 * @class AdapterCore
 * @version 3.2.1
 */
class AdapterCore {
    constructor(params = {}, db){
        // Generic columns -- Every table has this
        this.id;
        this.uuid;
        this.status;
        this.created;
        this.updated;
        this.creator;

        this._enums = params.enums || {};

        this.prefix = this._enums.PREFIX || params.prefix || '';

        this._params = {}
        this._values = this._enums.VALUES || []
        this._adapters = {}
        this._db = Database(db)
        this._cache = Cache()
        this._validate = Validate

        // Execs
        if(params.enums) delete params.enums
        if(params.prefix) delete params.prefix

        // Identifiers
        if(params.id || params[`${this.prefix}id`]){
            this.id = Validate.number(params.id || params[`${this.prefix}id`], { length: { min: 0 } })

            delete params.id
            delete params[`${this.prefix}id`]
        }
        if(params.uuid || params[`${this.prefix}uuid`]){
            this.uuid = Validate.uuid(params.uuid || params[`${this.prefix}uuid`])

            delete params.uuid
            delete params[`${this.prefix}uuid`]
        }

        // Uniques
        if(Array.isArray(this._enums.UNIQUES)) this._enums.UNIQUES.forEach(key => {
                // Ignore if already parsed
                if(key == 'id' || key == 'uuid' ) return;

                const value = params[key] || params[`${this.prefix}${key}`]

                // Value exists?
                if(typeof value != "undefined"){
                    const validationData = (this._enums.VALIDATIONS || {})[key]

                    // Has a validate option?
                    if( validationData ) {
                        // Setup temp data object
                        const tempData = {}
                        tempData[key] = value

                        // Validate value
                        try {
                            this._validateDataFn(key, tempData, validationData)
                        } catch(err){
                            console.log(err)
                        }

                        // Assign
                        this[key] = tempData[key]

                        // Delete from params
                        delete params[key]
                        delete params[`${this.prefix}${key}`]
                    }
                }
            })

        // Default params
        this._params = this.parseDefaultParams(['updated', 'created', 'creator'], params)
    }
    validateParams(params, ignores, firstValidation){
        try {
            const data = this.validateData(params, ignores, firstValidation)
            // Assign
            Object.keys(data).forEach(key => {
                // Assing in adapter
                this[key] = data[key]
                // Remove from data
                delete data[key]
            })
        } catch(err) {
            throw { fault: "client", msg: "Data rejected at validation", data: { err } }
        }
    }
    /**
     * 
     * @param {Array} defaultParams 
     * @param {object} params 
     */
    parseDefaultParams(defaultParams = [], params = {}){
        // Loop default params
        defaultParams.forEach(paramName => {
            if(params[paramName] || params[`${this.prefix}${paramName}`]){
                this[paramName] = params[paramName] || params[`${this.prefix}${paramName}`]
    
                delete params[paramName]
                delete params[`${this.prefix}${paramName}`]
            }
        })
        // Return remaining params
        return params
    }
    /**
     * 
     * @param {String} adapter 
     * @param {String} column 
     * @param {*} value 
     */
    _parseAdapter(adapter = 'User', column, value){
        // Validate adapter
        if(!this[`_${adapter}`]) throw "Please provide a valid adapter"

        // Column is array?
        this.columnIsArray = column.match("[]")
        if(this.columnIsArray){
            if(!Array.isArray(this[column])) this[column] = []
            column = column.replace("[]", '')
        }

        // Get field
        let field;
        try {
            Validate.number(value)
            field = "id"
        } catch {} // Ignore
        try {
            Validate.uuid(value)
            field = "uuid"
        } catch {} // Ignore

        // Process
        try {
            if(!field) throw "Invalid field provided"

            // Define params
            const params = {}
            params[field] = value

            // Store reference if doesn't exists
            const adapterObj = this[`_${adapter}`](params)
            if(!this._adapters[`${adapter}_${adapterObj[field]}`]) this._adapters[`${adapter}_${adapterObj[field]}`] = adapterObj

            // Assign reference
            if(this.columnIsArray){
                this[column].push(this._adapters[`${adapter}_${adapterObj[field]}`] || adapterObj)
            } else {
                this[column] = this._adapters[`${adapter}_${adapterObj[field]}`] || adapterObj
            }
        } catch {
            if(!this.columnIsArray) this[column] = undefined
        }

        // Return
        return this[column]
    }
    _getIDFromAdapter(adapter, stageData = {}, ignoreErrors = true){
        return new Promise(async (resolve, reject) => {
            // Parse string
            if(typeof adapter == "string") {
                // Try uuid ?
                try {
                    Validate.uuid(adapter)

                    // Stage 
                    return resolve(this._db.stageIDFromUUID(adapter, stageData.table, stageData.prefix))
                } catch {} // Ignore error
                
                // Setup as adapter
                // adapter = this[adapter]
            }

            if(typeof adapter == "object"){
                // In case of promise
                adapter = await adapter
                // Try with id
                try {
                    Validate.number(adapter.id)

                    return resolve(adapter.id)
                } catch {} // Ignore error

                // Try uuid ?
                try {
                    Validate.uuid(adapter.uuid)

                    // Stage 
                    return resolve(this._db.stageIDFromUUID(adapter.uuid, stageData.table, stageData.prefix))
                } catch {} // Ignore error

                // Fill and try again
                try {
                    await adapter.fill()
                    return resolve(adapter.id)
                } catch(err) {} // Ignore error
            }

            // Error
            return (ignoreErrors) ? resolve() : reject(`The provided column isn't valid`)
        })
    }
    /**
     * Find Sub-Adapters by Adapter and Update-- References
     */
    async updateAdapters(data = {}){
        let adapters = []
        let Ids = []
        // Get Keys To Update
        let keys = Object.keys(data)

        keys.map(async key =>{
            try {
                // Validate Enums Adapters
                if(Object.keys(this._enums.ADAPTERS).indexOf(key) == -1) throw "Is not Adapter"
                // Push Promise Adapter
                adapters.push(this._parseAdapter(this._enums.ADAPTERS[key],key,data[key]))
            } catch{
                // Delete key not Validate
                keys.splice( keys.indexOf(key), 1 )
                return
            }
        })
        adapters = await Promise.all(adapters)
        let i = 0
        //Get Ids From Adaptes
        adapters.map(adapter =>{
            if(adapter == undefined){
                // Delete key not Validate
                keys.splice(i,1)
                return
            }
            // Push  Id From UUID
            Ids.push(this._db.stageIDFromUUID(adapter.uuid ,adapter._enums.TABLE,adapter._enums.PREFIX))
            i++
        })
        data = {}
        i = 0
        // Create Data whit Validate Keys
        Ids.map(id=>{
            data[keys[i]] = id
            i++
        })
        // Update
        return this.update(data)

    }
    /**
     * Fill all defined adpters -- References
     */
    fillAdapters(){
        return new Promise((resolve, reject) => {
            try {
                Promise.all(Object.keys(this._adapters).map(key => this._adapters[key].fill()))
                    .then(resp => resolve(this))
                    .catch(reject)
            } catch(err){
                console.log(err)
            }
        })
    }

    async fillWithExistingDBData(data){
        if(data[`${this.prefix}id`]){
            this.id = Validate.number(data[`${this.prefix}id`], { length: { min: 0 } })
            delete data[`${this.prefix}id`]
        }
        if(data[`${this.prefix}uuid`]){
            this.uuid = Validate.uuid(data[`${this.prefix}uuid`])
            delete data[`${this.prefix}uuid`]
        }
        if(data[`${this.prefix}updated`]){
            this.updated = data[`${this.prefix}updated`]
            delete data[`${this.prefix}updated`]
        }
        if(data[`${this.prefix}created`]){
            this.created = data[`${this.prefix}created`]
            delete data[`${this.prefix}created`]
        }

        data = await this.validateFileData( data, ["file"] )

        Object.keys(data).forEach(key => {
            if(!data[key]) return;

            this[key] = data[key]
        })

        return this
    }
    fill(options = {}){
        return new Promise( async (resolve, reject) => {
            let wheres = []
            try {
                wheres = this._getDBWheres()
            } catch(err) {
                return reject({ fault: "client", msg: err, data: {} })
            }


            // Enums cache options
            if(typeof this._enums.CACHE == "object"){
                if(!options.cache) options.cache = {}

                if(!options.cache.group && this._enums.CACHE.GROUP) options.cache.group = this._enums.CACHE.GROUP
                if(!options.cache.identifier && this._enums.CACHE.IDENTIFIER) options.cache.identifier = this._enums.CACHE.IDENTIFIER
            }

            let data;
            const group = (options.cache || {}).group || this.prefix.toLowerCase().replace('_', '')
            // Is @ cache?
            try {
                
                data = await this._cache.get( group, this[(options.cache || {}).identifier] || this.uuid || this.id )
            } catch {} // Ignore -- not found

            if(!data){
                // Get from database
                const db = Database(this._db)

                wheres.forEach(row => {
                    db.where(row.column, row.value)
                })
                try {
                    data = await db.getOne(this._enums.TABLE)
                    if(!Object.keys(data || {}).length) return reject({ fault: "client", msg: "Not found", data: { code: 404 } })
                } catch(err){
                    return reject({ fault: "server", msg: "Query error", data: { err } })
                }

                // Parse data
                data = this.parseDataKeys(data)

                // Cache data
                try {
                    await this._cache.save(group, data, { uniques: (this._enums.UNIQUES || {}), ...options.cache })
                } catch {} // Ignore
            }

            // Parse data contents
            Object.keys(data).forEach(key => {
                const value = data[key]

                // Is Date?
                if(/GMT/.test(value)){
                    data[key] = new Date(value)
                }
                // IS null?
                else if(value == "null"){
                    delete data[key]
                }
            })

            // Assign
            try {
                Object.keys(data).forEach(key => {
                    // Ignore if exists
                    if((this._enums.FILL_IGNORE_IF_EXISTS || []).includes(key) && this[key]) return;
    
                    // is Array
                    if(Array.isArray(data[key])){
                        this[key] = data[key].map(element => {
                            if(Object.keys(this._enums.ADAPTERS || []).includes(key)) return  this._parseAdapter(this._enums.ADAPTERS[key], key+"[]", element)
                            return element
                        })
                        return
                    }
                    // is Adapter?
                    if(Object.keys(this._enums.ADAPTERS || []).includes(key)) return this[key] = this._parseAdapter(this._enums.ADAPTERS[key], key, data[key])
                    
                    // Parse Date
                    if((!['updated','created'].includes(key)) && data[key] instanceof Date) data[key] = `${data[key].getFullYear()}/${(data[key].getMonth() + 1).toString().padStart(2, "0")}/${data[key].getDate().toString().padStart(2, "0")}`
                    
                    // Assign value
                    this[key] = data[key]

                })

                // With children?
                if(options.childrens || this._enums.FILL_CHILDRENS) await this.childrens()

            } catch(err) {
                return reject(err)
            }

            resolve(this)
        })
    }
    parseDataKeys(data){
        const parsedData = {}
        Object.keys(data).forEach(key => {
            // Remove prefix by default
            let parsedKey = key.replace(this.prefix, '')

            // Multiple parse
            if(Array.isArray(this._enums.PARSE_REGEX)) this._enums.PARSE_REGEX.forEach(regex => {
                parsedKey = parsedKey.replace(regex, '')
            })

            // Single parse
            else parsedKey = parsedKey.replace(this._enums.PARSE_REGEX, '')

            // Array Values
            if((this._enums.ARRAY_VALUES||[]).includes(parsedKey)) data[key] = data[key].split(",")
            // Store
            parsedData[parsedKey] = data[key]
        })

        return parsedData
    }
    childrens(){
        return new Promise((resolve, reject) => {
            // Has childrens?
            if(this._enums.CHILDRENS){
                // Get childrens
                Promise.all(
                    Object.keys(this._enums.CHILDRENS).map(key => new Promise((resolve, reject) => {
                            //
                            const { adapter, column, parent_key } = this._enums.CHILDRENS[key]
    
                            // Initialize key as array -- Spread values if already exists
                            this[key] = [ ...(this[key] || [])]
    
                            // Set where
                            this._db.where(column, this.id) // Always must be the id
                            this._db.get(enums[adapter].TABLE, undefined, `${enums[adapter].PREFIX}uuid as uuid`)
                                .then(childrens => {
                                    // Store in key array
                                    childrens.forEach(child => {
                                        // Push in array if doesn't exists
                                        if( this[key].indexOf(child.uuid) === -1) this[key].push(child.uuid)
                                    })
    
                                    resolve(this[key])
                                })
                                .catch(reject)
    
                        })
                    ))
                    .then(resolve)
                    .catch(reject)
            }
        })
    }
    /**
     * Return object containing the public values of the adapter.
     */
    values(detailedValues = this._detailedValues || this._enums.DETAILED_VALUES){
        return new Promise(async (resolve, reject) => {
            // Parse detailedValues
            if(typeof detailedValues == "string") detailedValues = detailedValues.split(/\s*,\s*/g)

            // Fetch user values
            try {
                const values = {}
                await Promise.allSettled(this._values.map(async key => {
                        if(!this._enums.VALUES.includes(key)) return;

                        // Parse values
                        switch(typeof this[key]){
                            // For adapters
                            case 'object':
                                // Array no Adapters
                                if(Array.isArray(this[key]) && typeof this[key][0] != "object")return values[key] = this[key]

                                const detailed = Array.isArray(detailedValues) ? detailedValues.includes(key) : false
                                values[key] = await this.valueObjParser(this[key], detailed, detailedValues)
                                return;
                            // String
                            case 'string':
                                try {
                                    if(this[key].match(/\{|\[/)) {
                                        values[key] = JSON.parse(this[key])
                                        return;
                                    }
                                } catch(err){} // Ignore
                            default:
                                return values[key] = this[key]
                        }
                    }))

                // Resolve
                resolve(values)

            } catch(err) {
                reject({ fault: "server", msg: "Unable to parse values", data: { err } })
            }
        })
    }
    async valueObjParser(value, detailed, detailedValues = []){
        // Is Array?
        if(Array.isArray(value)){
            return await Promise.all(value.map(async val => await this.valueObjParser(await val)))
        }

        // Is Null?
        if(value == null) return;

        // Is Date?
        try {
            if(value instanceof Date) return value
        } catch {} // Ignore

        // Return uuid if exists
        if(value.uuid) return value.uuid

        // Fill and return uuid
        if(typeof value.fill == "function") {
            await value.fill()

            // The false in values prevents infinite detailed values
            return detailed ? value.values(detailedValues) : value.uuid
        }
    }
    /**
     * Return JSON String containing the public values of the adapter.
     */
    toJSON(){
        return new Promise((resolve, reject) => {
            try {
                this.values()
                    .then(values => resolve( JSON.stringify(values) ))
                    .catch(reject)
            } catch(err) {
                reject(err)
            }
        })
    }
    /**
     * Get wheres from index
     */
    _getDBWheres(){
        const wheres = []
        // Use ID and/or UUID
        try {
            // Validate id
            Validate.number(this.id, { length: { min: 0 } })

            // Store as where
            wheres.push({
                column: `${this.prefix}id`,
                value: this.id
            })
        } catch {} // Ignore
        try {
            // Validate uuid
            Validate.uuid(this.uuid)

            // Store as where
            wheres.push({
                column: `${this.prefix}uuid`,
                value: this.uuid
            })
        } catch {} // Ignore

        // Custom identifier (other unique)
        this._enums.UNIQUES.forEach(key => {
            if(key == "id" || key == "uuid") return;

            if(typeof this[key] != "undefined") wheres.push({
                    column: `${this.prefix}${key}`,
                    value: this[key]
                })
        })

        // ID or UUID must be present at this point to continue
        if(!wheres.length) throw `The adapter requires an unique identifier [${this._enums.UNIQUES.join(", ")}]`

        // Return wheres
        return wheres
    }
    /**
     * Update row
     */
    update(data = {}){
        return new Promise(async (resolve, reject) => {
            // Ignore on update
            const ignoreOnUpdate = ["id", "uuid", "creator", "created", "updated", ...(this._enums.IGNORE_ON_UPDATE || [])]

            // Parse data
            // const promises = []
            const parsedData = {}
            try {
                await Promise.all( Object.keys(data).map(async key => {
                    // Must not be an ignored adapter value
                    if(!this._enums.VALUES.includes(key) || ignoreOnUpdate.includes(key)) return;

                    // Image
                    if((this._enums.FILES || {})[key]){
                        try {
                            // Assign params
                            const imageParams = (this._enums.SAVE || {})[key] ? this._enums.SAVE[key](this, enums) || this._enums.FILES[key] : this._enums.FILES[key]
    
                            // Parse name
                            const isNameAVar = /^\{{1}([a-z]+)\}{1}$/.exec(imageParams.name)
                            const name = `${(isNameAVar ? this[isNameAVar[1]] : imageParams.name) || this.uuid}_${new Date().getTime()}`
                            
                            // Await upload and asign
                            parsedData[`${this._enums.PREFIX}${key}`] = await CDN(imageParams.variant).upload(name, data[key], { uriValues: this, overwrite: true })
                            return parsedData[`${this._enums.PREFIX}${key}`]
                        } catch(err) {
                            return reject({ fault: "server", msg: "Invalid image configuration", data: { err } })
                        }
                    }

                    // Update Adapters
                    else if(Object.keys(this._enums.ADAPTERS || {}).includes(key)) { 
                        try {
                            const adapter = this._enums.ADAPTERS[key]
                            if(!this[`_${adapter}`]) throw `Adapter "${adapter}" not defined`

                            // Get adapter enums -- USER as default
                            const AdapterEnums = (this._enums.SAVE || {})[key] ? this._enums.SAVE[key](enums) || enums.USER : enums.USER
    
                            // Get columnKey
                            const columnKey = adapter.toLowerCase() == key ? `${key}_id` : `${adapter.toLowerCase()}_${key}_id`
                            
                            // Nullify
                            if(data[key] == "null" || data[key] == null) return parsedData[columnKey] = "null"

                            // Store at data
                            parsedData[columnKey] = this._db.stageIDFromUUID(data[key], AdapterEnums.TABLE, AdapterEnums.PREFIX)

                            return parsedData[columnKey]
                        } catch(err) {
                            console.log(err)
                        }
                        return
                    }
                    // Implement an validation by config file!
                    return parsedData[`${this._enums.PREFIX}${key}`] = data[key]
                }))
            } catch(err){
                console.log(err)
            }

            // Reject if no data remaining
            if(!Object.keys(parsedData).length) return reject({ fault: "client", msg: "No valid data provided", data })

            // Set wheres
            try {
                this._getDBWheres().forEach(row => {
                    this._db.where(row.column, row.value)
                })
            } catch(err) {
                return reject({ fault: "client", msg: err, data })
            }

            // Query
            this._db.update(this._enums.TABLE, parsedData)
                .then(async resp => {
                    // Purge cache
                    try {
                        await this._cache.flush(this.prefix.replace('_', '').toLowerCase(), this.uuid)
                    } catch(err){
                        console.log(err)
                    }

                    // Fill
                    this.fill()
                        .then(resolve)
                        .catch(reject)
                })
                .catch(err => reject({ fault: "server", msg: "Update query error", data: { err } }))
        })
    }
    /**
     * Archive row
     */
    archive(){
        return new Promise((resolve, reject) => {
            // Look for archived status
            const archived = Object.keys(this._enums.STATUS).find(key => this._enums.STATUS[key] == "archived")

            // Can be archived?
            if(!archived) return reject({ fault: "client", msg: "This adapter can't be archived", data: { code: 403 } })

            // Update type
            this.update({ status: archived })
                .then(resolve)
                .catch(reject)
        })
    }
    /**
     * Nulled Colum
     */
    NullifyAdapters(adapters = []){
        return new Promise((resolve, reject) => {
            let data = {}
            // Create Data Null
            adapters.map( adapter =>{
                if(Object.keys(this._enums.ADAPTERS || {}).includes(adapter) && !["files","xml"].includes(adapter)) data[adapter] = undefined
            })
            // Update type
            this.update(data)
                .then(resolve)
                .catch(reject)
        })
    }

    validateData(data = {}, ignore = [], firstValidation = false){
        // Parse BlogPostData
        data = this.parseDataKeys(data)

        const errors = {}
        let validationData;

        // Validate data
        Object.keys(this._enums.VALIDATIONS).forEach(key => {
            try {
                validationData = (this._enums.VALIDATIONS || {})[key]

                // Validate fn
                this._validateDataFn(key, data, validationData )

            // Error handling
            } catch(err) {
                if(  Object.keys(this._enums.FILES || {}).includes(key)  || ( validationData.fromParser && firstValidation ) ){
                    // File or firstValidation and data from parser does not trigger errors
                    data[key] = undefined
                } else if(!validationData.optional) {
                    // Store error
                    errors[key] = err
                }
            }
        })

        // Throw err if has errors
        if(Object.keys(errors).filter(key => !ignore.includes(key)).length) throw errors

        // Return validated object
        return data
    }
    /**
     * 
     */
    _validateDataFn(key, data = this, validationData = {}){
        // validationData values
        const type = validationData.type || validationData
        const parser = typeof validationData.parser == 'function' ? validationData.parser : e => e;
        const value = parser( data[key] || this[key] || (typeof validationData.default != "undefined" ? validationData.default :((type == "uuid" ? UUID() : undefined))), this )
        const options = validationData.options || {}

        // Is adapter?
        if(Object.keys(this._enums.ADAPTERS || {}).includes(key)){
            const adapter = this._enums.ADAPTERS[key]
            // Adapter validation
            data[key] = typeof value == "object" ? value : this._parseAdapter(adapter, `${key}`, value)
            if(!data[key] instanceof this[`_${adapter}`]) throw `${options.label || key.charAt(0).toUpperCase() + key.slice(1)} is not a valid ${adapter}`
        // Is Boolean
        } else if(type == "boolean") {
            data[key] = value ? true : false

        // Default validation
        } else {
            const validatedValue = (Validate[type] || Validate.string)( value, options )
            if(validatedValue != "undefined") data[key] = validatedValue
        }

        // Returns parsed data
        return data
    }
    save(update = false, middleware = e => e){
        return new Promise( async (resolve, reject) => {
            // Validate data
            try {
                // Ignore uniques if update
                const dataValidation = await this.validateData(this, update ? this._enums.UNIQUES : undefined)
                // Assign
                Object.keys(dataValidation).forEach(key => {
                    this[key] = dataValidation[key]
                })
            } catch(err) {
                return reject({ fault: "client", msg: "Invalid data", data: { err } })
            }

            // Setup data
            const data = {}
            const promises = []

            Object.keys(this._enums.VALIDATIONS).forEach(key => {
                try {
                    // Is update?
                    if(update){
                        // Ignore on update
                        if(["id", "uuid", "creator", "created", "updated", ...this._enums.IGNORE_ON_UPDATE || []].includes(key)) return;
                    } else {
                        // Ignore on save
                        if( (this._enums.IGNORE_ON_SAVE || []).includes(key)) return;
                    }

                    // Is adapter?
                    if( Object.keys(this._enums.ADAPTERS).includes(key) ) {
                        const adapter = this._enums.ADAPTERS[key]
                        
                        // Get adapter enums -- USER as default
                        const AdapterEnums = (this._enums.SAVE || {})[key] ? this._enums.SAVE[key](enums) || enums.USER : enums.USER

                        // Store at data
                        const columnKey = adapter.toLowerCase() == key ? `${key}_id` : `${adapter.toLowerCase()}_${key}_id`
                        data[columnKey] = this._getIDFromAdapter(this[key], { table: AdapterEnums.TABLE, prefix: AdapterEnums.PREFIX })

                        promises.push(data[columnKey])

                    // Is image?
                    } else if( Object.keys(this._enums.FILES || {}).includes(key) ){
                        // Has data?
                        if(!this[key]) return;

                        // Assign params
                        const imageParams = (this._enums.SAVE || {})[key] ? this._enums.SAVE[key](this, enums) || this._enums.FILES[key] : this._enums.FILES[key]

                        // Parse name
                        const isNameAVar = /^\{{1}([a-z]+)\}{1}$/.exec(imageParams.name)
                        const name = (isNameAVar ? this[isNameAVar[1]] : imageParams.name) || this.uuid

                        // Await upload and asign
                        data[`${this._enums.PREFIX}${key}`] = CDN(imageParams.variant).upload(name, this[key], { uriValues: this, overwrite: update })
                        promises.push(data[`${this._enums.PREFIX}${key}`])
                    // Is children?
                    } else if( Object.keys(this._enums.CHILDRENS || {}).includes(key) ){
                        // Ignore childrens
                    } else {
                        // Default
                        data[`${this._enums.PREFIX}${key}`]  = this[key]
                    }
                    
                } catch(err) {
                    // console.log(err)
                }
            })

            await Promise.allSettled(promises)

            // Verify if some files throwed an error
            Object.keys(this._enums.FILES || {}).forEach(async key => {
                try {
                    data[`${this._enums.PREFIX}${key}`]
                        // Set undefined if error
                        .catch(err => delete data[`${this._enums.PREFIX}${key}`])

                } catch {} // Ignore
            })  

            // Remove promises in data
            Object.keys(data).forEach(async key => {
                const value = await data[key]
                if(update && typeof value == "undefined")
                    delete data[key]
                else 
                    data[key] = value
            })

            // DB Insert or update
            if(update) {
                
                // Set update wheres
                this._enums.UNIQUES.forEach(column => {
                    if(this[column]) this._db.where(`${this._enums.PREFIX}${column}`, this[column])
                })
            }

            this._db[update ? 'update' : 'insert'](this._enums.TABLE, data)
                .then(async resp => {
                    // Purge cache if updated
                    if(update) {
                        try {
                            await this._cache.flush(((this._enums.CACHE || {}).GROUP || this.prefix.replace('_', '')).toLowerCase(), this[(this._enums.CACHE || {}).IDENTIFIER || 'uuid'] || this.uuid)
                        } catch(err){
                            console.log(err)
                        }
                    } else {
                        this.id = resp.insertId

                    }

                    console.log("Saved")

                    // resolve(resp)
                    this.fill()
                        .then(resolve)
                        .catch(reject)
                })
                .catch(async err => {
                    if(err.code == "ER_DUP_ENTRY"){
                        reject({ fault: "client", msg: "Duplicated entry", data: { code: 409, err } })
                    } else {
                        reject({ fault: "server", msg: "Insert error", data: { err } })
                    }
                })
        })
    }
    
    static ParseDataKeys(data, enums = {}, values){
        const parsedData = {}

        Object.keys(data).forEach(key => {
            // Remove prefix by default
            let parsedKey = key.replace(enums.PREFIX, '')

            // Multiple parse
            if(Array.isArray(enums.PARSE_REGEX)) enums.PARSE_REGEX.forEach(regex => {
                parsedKey = parsedKey.replace(regex, '')
            })

            // Single parse
            else parsedKey = parsedKey.replace(enums.PARSE_REGEX, '')

            // Array Values
            if((enums.ARRAY_VALUES || []).includes(parsedKey)) data[key] = data[key].split(",")

            // Ignore if values not a requested value
            if(Array.isArray(values)) if(!values.includes(parsedKey)) return;

            // Store only values
            if(enums.VALUES.includes(parsedKey)) parsedData[parsedKey] = data[key]
        })

        return parsedData
    }
}

module.exports = params => new AdapterCore(params)
module.exports.Class = AdapterCore

module.exports.setDefaultDB = db => params => new AdapterCore(params, db)
module.exports.parseDataKeys = AdapterCore.ParseDataKeys