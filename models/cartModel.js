const mongoose = require('mongoose')
const cartSchema = mongoose.Schema({
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
        } ,
        total:{
          type:Number,
          required:true
        }
      }],
      totalPrice:{
        type:Number
      },
      discount:{
        type:Number
      },
      subtotal:{
        type:Number
      },
      GrandTotal:{
        type:Number
      },
      is_used : {
        type : Boolean,
        default:false
    },
    coupons:{
      type:Array,
      required:true
  },

})

module.exports = mongoose.model('cart',cartSchema)