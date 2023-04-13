const morgan = require('morgan')
const userRout = require('./router/userRout')
const adminRout = require('./router/adminRout')
const session = require('express-session')
const nocache = require('nocache')
const path = require('path')
const config = require('./config/config')
require('dotenv').config();
config.mongooseConnection()
const express = require('express')
const app = express()
app.use(morgan("dev"));
app.use(nocache())
app.set('view engine','ejs')
app.set('views','./views/users')
app.use((error,req,res,next)=>{
    res.status(error.status||500)
    res.render('errorpage')
})

app.use(session({ secret:process.env.SECRET_KEY , cookie: { maxAge: 60000 * 100 }, saveUninitialized: true, resave: true }))
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/admin', adminRout)
app.use('/', userRout)
app.listen(process.env.PORT, () => {
    console.log('server Running');
})
