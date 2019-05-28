const sequelize = global.sequelize
const Sequelize = require('sequelize')

const Comment = sequelize.define('comment', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  }
}, {
  freezeTableName: true
})

module.exports = Comment
