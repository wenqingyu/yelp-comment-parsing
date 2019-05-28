const sequelize = global.sequelize
const Sequelize = require('sequelize')

const Comment = sequelize.define('comment', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Business_Id: {
    type: Sequelize.INTEGER
  },
  Cus_Name: {
    type: Sequelize.STRING
  },
  Cus_Review_Rate: {
    type: Sequelize.STRING
  },
  Cus_Review_Date: {
    type: Sequelize.DATE
  },
  Review: {
    type: Sequelize.TEXT
  },
  url: {
    type: Sequelize.STRING
  },
  Helpful_Vote: {
    type: Sequelize.INTEGER,
    default: 0
  },
  Funny_Vote: {
    type: Sequelize.INTEGER,
    default: 0
  },
  Cool_Vote: {
    type: Sequelize.INTEGER,
    default: 0
  }
}, {
  freezeTableName: true
})

module.exports = Comment
