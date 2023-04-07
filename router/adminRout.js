const express = require("express")
const multer = require('../config/multer')
const admin_rout = express()

const adminController = require('../controllers/adminController')
const auth = require('../middleware/authAdmin')
const upload = multer.createMulter()
admin_rout.set('view engine', 'ejs')
admin_rout.set('views', './views/admin')

admin_rout.get('/', auth.adminLogin, adminController.loginLoad)

admin_rout.post('/',adminController.adminLogin)

admin_rout.get('/home', auth.logOutSession, adminController.loadAdminHome)

admin_rout.get('/logout', auth.logOutSession, adminController.adminLogOut)

admin_rout.get('/userData', auth.logOutSession, adminController.loadUserData)

admin_rout.get('/blockUser', auth.logOutSession, adminController.blockUser)

admin_rout.get('/unblockUser', auth.logOutSession, adminController.unblockUser)

admin_rout.get('/addProduct', auth.logOutSession, adminController.newProduct)

admin_rout.post('/addProduct',auth.logOutSession,upload.array('image',4),adminController.addProduct)

admin_rout.get('/category',auth.logOutSession,adminController.categoryManage)

admin_rout.post('/addCategory',auth.logOutSession,adminController.addCategory)

admin_rout.post('/editCategory',auth.logOutSession,adminController.editCategory)

admin_rout.post('/deleteCategory',auth.logOutSession,adminController.categoryDelete)

admin_rout.get('/products',auth.logOutSession,adminController.loadProducts)

admin_rout.post('/deleteProduct',auth.logOutSession,adminController.deleteProduct)

admin_rout.get('/editProduct',auth.logOutSession,adminController.loadEditPage)

admin_rout.post('/editProduct',auth.logOutSession,upload.array('image',4),adminController.editProduct)

admin_rout.get('/unlist',auth.logOutSession,adminController.unlistProduct)

admin_rout.get('/list',auth.logOutSession,adminController.listProduct)

admin_rout.get('/orders',auth.logOutSession,adminController.orders)

admin_rout.get('/cancelOrder',auth.logOutSession,adminController.cancelOrder)

admin_rout.get('/viewOrder',auth.logOutSession,adminController.viewOrder)

admin_rout.get('/orderStatus',auth.logOutSession,adminController.acceptDelivery)

admin_rout.get('/acceptOrder',auth.logOutSession,adminController.acceptOrder)

admin_rout.get('/rejectReturn',auth.logOutSession,adminController.rejectReturn)

admin_rout.get('/acceptReturn',auth.logOutSession,adminController.acceptReturn)

admin_rout.get('/Coupons',auth.logOutSession,adminController.CouponGenerate)

admin_rout.post('/addCoupon',auth.logOutSession, adminController.addCoupon)

admin_rout.get('/deleteCoupon', auth.logOutSession, adminController.deleteCoupon)

admin_rout.get('/banner',auth.logOutSession,adminController.bannersPage)

admin_rout.get('/addBanner',auth.logOutSession,adminController.loadAddBanner)

admin_rout.post('/addBanner',upload.array('image',2),adminController.addBanner)

admin_rout.get('/deleteBanner',auth.logOutSession,adminController.deleteBanner)

admin_rout.get('/salesReport',auth.logOutSession,adminController.loadSalesPage)



module.exports = admin_rout