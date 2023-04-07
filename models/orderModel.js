const mongoose = require('mongoose')
const orderSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    item: [{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Products',
            required:true,
        },
        price:{
          type:Number,
          required:true
        },
        quantity:{
          type:Number,
          default:1,
          required:true
        } 
      }],
      totalPrice:{
        type:String
      },
      discount:{
        type:Number
      },
      grandTotal:{
        type:Number
      },
      is_delivered:{
        type:Boolean,
        default:false
      },
      is_confirmed:{
        type:Boolean,
        default:false
      },
      user_cancelled:{
        type:Boolean,
        default:false
      },
      admin_cancelled:{
        type:Boolean,
        default:false
      },
      orderCount: {
        type: Number,
        default: 0
      },
      address:{
        type:Array
      },
      date:{
        type:Date,
        required:true
      },
      delivered_date:{
        type:Date
      },
      return: {
        type: Boolean,
        default: false
      },
      admin_reject:{
        type:Number,
        default:0
      },
      paymentType:{
        type:String,
        require:true
      }
})

module.exports = mongoose.model('orders',orderSchema)