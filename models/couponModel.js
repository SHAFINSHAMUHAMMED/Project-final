const mongoose = require('mongoose')
const couponSchema= mongoose.Schema({
    couponId : {
        type : String,
        required : true
    },
    expiryDate : {
        type : Date,
        required : true
    },
    minItems : {
        type : Number,
        required : true
    },
    minAmount : {
        type : Number,
        required : true
    },
    maxAmt : {
        type : Number,
        required : true
    },
  
    discount : {
        type : Number,
        required : true
    },
    status : {
        type : Boolean,
        default:false
    }
})

module.exports = mongoose.model('coupon',couponSchema)