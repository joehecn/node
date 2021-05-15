
'use strict'

const dbHost = process.env.DB_HOST || 'localhost'
const getModel = require('../model.js')
const Zxdata = getModel(dbHost, 'auth', 'zxdata')

exports.getZxdata = async () => {
  const res = await Zxdata.findOne({ id: 1 })
  return res
}
