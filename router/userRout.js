const express = require('express')
const user_route = express()
const userMulter = require('../config/userMulter')
const upload = userMulter.userMulter()
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')

user_route.set('view engine','ejs')
user_route.set('views','./views/users')

user_route.get('/signup',auth.loginSession,userController.userSignup)

user_route.post('/signup',userController.insertUser)

user_route.get('/login',auth.loginSession,userController.loginUser)

user_route.get('/verify',userController.verifyMail)

user_route.post('/login',userController.verifyLogin)

user_route.get('/',userController.loginHome)

user_route.get('/loginHome',auth.logOutSession,userController.loginHome)

user_route.get('/logout',auth.logOutSession,userController.logOut)

user_route.get('/logoutIn',userController.logOutIn)

user_route.get('/otp-login',auth.loginSession,userController.otpLogin)

user_route.get('/otpVerifyMail',auth.loginSession,userController.verifyotpMail)

user_route.post('/otpVerifyMail',userController.verifyotpMail)

user_route.get('/otp-page',auth.loginSession,userController.otppage)

user_route.get('/otpSubmit',auth.loginSession,userController.otpVerify)

user_route.post('/otpSubmit',userController.otpVerify)

user_route.get('/addToCart',auth.logOutSession,userController.addtocart)

user_route.post('/addToCart',auth.logOutSession,userController.addingToCart)

user_route.get('/deleteCart',auth.logOutSession,userController.deleteCart)

user_route.get('/incrementCart', auth.logOutSession, userController.incrementCart)

user_route.get('/decrementCart', auth.logOutSession, userController.decrementCart)

user_route.get('/checkout',auth.logOutSession,userController.checkout)

user_route.get('/userProfile',auth.logOutSession,userController.userProfile)

user_route.get('/ordersView',auth.logOutSession,userController.ordersView)

user_route.get('/editProfile',auth.logOutSession,userController.loadEditProfile)

user_route.post('/editProfile',auth.logOutSession,upload.single('image'),userController.editProfile)

user_route.get('/address',auth.logOutSession,userController.address)

user_route.get('/addAddress',auth.logOutSession,userController.checkout)

user_route.get('/deleteAddress',auth.logOutSession,userController.deleteAddress)

user_route.post('/postNewAddress',auth.logOutSession,userController.addNewAddress)

user_route.get('/addNewAddress',auth.logOutSession,userController.getNewAddress)

user_route.get('/productView',auth.logOutSession,userController.productView)

user_route.post('/paymentPage',auth.logOutSession,userController.payment)

user_route.get('/paymentPage',auth.logOutSession,userController.payment)

user_route.post('/payMethod',auth.logOutSession,userController.orderPlaced)

user_route.get("/success",auth.logOutSession,userController.createPayment)

user_route.get('/changePassword',auth.logOutSession,userController.loadChangePassword)

user_route.post('/changePassword',auth.logOutSession,userController.changePassword)

user_route.get('/cancelOrder',auth.logOutSession,userController.cancellOrder)

user_route.get('/returnOrder',auth.logOutSession,userController.returnOrder)

user_route.get('/cancellReturn',auth.logOutSession,userController.cancellReturn)

user_route.get('/shopPage',auth.logOutSession,userController.shopPage)

user_route.get('/wishList',auth.logOutSession,userController.wishList)

user_route.post('/addingTOWishlist',auth.logOutSession,userController.addingTOWishlist)

user_route.get('/deleteWishlist',auth.logOutSession,userController.deleteWishlist)

user_route.post('/shopFilter',auth.logOutSession,userController.filterPrice);

user_route.post('/couponApply',auth.logOutSession,userController.couponApply)

user_route.post('/add-money',auth.logOutSession,userController.addmoney)

user_route.get("/addtowallet",auth.logOutSession,userController.addtowallet)

user_route.get("/contactus", auth.logOutSession, userController.contactus)

user_route.get('/razorpayConfirm',auth.logOutSession,userController.razorpayConfirm)

user_route.get('/razorpay',auth.logOutSession, userController.razorpay)

user_route.post('/message',auth.logOutSession,userController.sendMessage)

user_route.get('/returnPolicy',userController.returnPolicy)

user_route.get('/faqs',userController.faqs)

user_route.get("*",function(req,res){res.render("errorpage")})




module.exports = user_route