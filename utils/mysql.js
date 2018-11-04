const fs = require('fs')
const config = require('config')
const path = require('path')
const CLASSMETHODS = 'classMethods'
const ASSOCIATE = 'associate'

const Sequelize = require('sequelize')
const Op = Sequelize.Op
var sequelize = new Sequelize(config.get('db.database'), config.get('db.options.user'), config.get('db.options.pass'), {
  host: config.get('db.options.host'),
  port: config.get('db.options.port'),
  dialect: 'mysql',
  define: {
    timestamps: false
  },
  query: {raw: true},
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  operatorsAliases: {
    $and: Op.and,
    $any: Op.any,
    $or: Op.or,
    $eq: Op.eq,
    $ne: Op.ne,
    $gt: Op.gt,
    $gte: Op.gte,
    $lt: Op.lt,
    $lte: Op.lte,
    $like: Op.like,
    $in: Op.in,
    $nin: Op.notIn,
    $strictRight: Op.strictRight,
    $contains: Op.contains
  }
})

sequelize.sync({
  force: false
})

global.sequelize = sequelize

let modelsPath = path.join(process.cwd(), '/models')

let models = fs.readdirSync(modelsPath)

let db = {}

for (let model of models) {
  if (model.startsWith('.')) {
    continue
  }
  let modelName = model.match(/^[^.]+/)[0]
  let modelSchema = require(path.join(modelsPath, model))
  db[ modelName ] = modelSchema
}

Object.keys(db).forEach(function (modelName) {
  if (CLASSMETHODS in db[modelName].options) {
    if (ASSOCIATE in db[modelName].options[CLASSMETHODS]) {
      db[modelName].options.classMethods.associate(db)
    }
  }
})

module.exports = db
