
'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

module.exports = new Schema({
  id: {
    type: Number,
    default: 1
  },
  company: Number,
  team: Number,
  person: Number
})
