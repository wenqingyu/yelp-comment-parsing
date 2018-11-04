const sequelize = global.sequelize
const Sequelize = require('sequelize')

const Business = sequelize.define('business', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: Sequelize.STRING
  },
  Rest_Name: {
    type: Sequelize.STRING
  },
  Rest_Rate: {
    type: Sequelize.STRING
  },
  Rest_total_Reviews: {
    type: Sequelize.STRING
  },
  Rest_location: {
    type: Sequelize.STRING
  },
  city: {
    type: Sequelize.STRING
  }
}, {
  freezeTableName: true,
  timestamps: true,
  createdAt: 'createby',
  updatedAt: 'updateby'
})

module.exports = Business
