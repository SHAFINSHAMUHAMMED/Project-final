const mongoose = require('mongoose')
const productSchema = mongoose.Schema({
    categoryid:{
        type:mongoose.Schema.Types.ObjectId,
            ref:'category',
            require:true,
      },
      
    title:{
        type:String,
        require:true
    },
    brand:{
        type:String,
        require:true
    },
    price:{
        type:Number,
        require:true
    },
    discount:{
        type:Number,
    },
    stock:{
        type:Number,
        require:true
    },
    description:{
        type:String,
        require:true
    },category:{
        type:String,
        require:true
    },
    image:{
        type:Array,
        require:true
    },
    color:[{
        type:String,
        require:true
    }],
    size:[{
        type:String,
        require:true
    }],
    unlisted:{
        type:Number,
        default:0
      },
})

module.exports = mongoose.model('Products',productSchema)