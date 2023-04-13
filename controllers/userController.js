const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const productSchema = require("../models/productModel");
const cartSchema = require("../models/cartModel");
const orderSchema = require("../models/orderModel");
const couponSchema = require("../models/couponModel");
const bannerSchema = require("../models/bannerModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

const regex_password = /^(?=.*?[A-Z])(?=.*[a-z])(?=.*[0-9]){8,16}/gm;
const regex_mobile = /^\d{10}$/;
const paypal = require("paypal-rest-sdk");
const { CURSOR_FLAGS } = require("mongodb");
paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPALCLIENT_ID,
  client_secret: process.env.PAYPALCLIENT_SCRT,
});
const Razorpay = require("razorpay");

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_PASS,
});

let message, msg, mess;
let orderStatus = 0;
let addressCount;
let session;

//////////SECURE PASSWORD////////////

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

///////////SEND EMAIL VERIFICATION////////

const sendVerifyMail = async (username, email, user_id) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "codershafinsha@gmail.com",
        pass: process.env.EMAILPASS,
      },
    });

    const mailOption = {
      from: "codershafinsha@gmail.com",
      to: email,
      subject: "Email verification",
      html: `<p>Hii ${username}, please click <a href="https://malefashion.shop/verify?id=${user_id}">here</a> to verify your email.</p>`,
    };

    transporter.sendMail(mailOption, (error, info) => {
      if (error) {
        console.log(error.message);
        console.log("Email could not be sent");
      } else {
        console.log("Email has been sent:", info.response);
      }
    });
  } catch (error) {
    console.log(error);
    console.log("Error occurred while sending email");
  }
};

/////////USER SUIGNUP//////////

const userSignup = async (req, res, next) => {
  try {
    res.render("signup", { message, msg });
    message = null;
    msg = null;
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

///////INSERT USERDATA//////////

const insertUser = async (req, res, next) => {
  const usd = req.body;
  let user;
  const checkMail = await User.findOne({ email: usd.email });
  const checkMob = await User.findOne({ phone: usd.phone });
  console.log(checkMail);

  try {
    if (!usd.email && !usd.phone && !usd.password && !usd.username) {
      res.redirect("/signup");
      msg = "Please fill all the forms";
    } else if (!usd.username || usd.username.trim().length < 3) {
      res.redirect("/signup");
      msg = "Enter valid name";
    } else if (!usd.email || usd.username.trim().length == 0) {
      res.redirect("/signup");
      msg = "Enter email";
    } else if (checkMail) {
      res.redirect("/signup");
      msg = "Email already exist";
    } else if (!usd.phone) {
      res.redirect("/signup");
      msg = "Enter mobile number";
    } else if (regex_mobile.test(usd.phone) == false) {
      res.redirect("/signup");
      msg = "Enter valid mobile no";
    } else if (checkMob) {
      res.redirect("/signup");
      msg = "Phone number already exist";
    } else if (!usd.password) {
      res.redirect("/signup");
      msg = "Enter password";
    } else if (regex_password.test(usd.password) == false) {
      res.redirect("/signup");
      msg = "Use strong password";
    } else if (usd.password != usd.Rpassword) {
      res.redirect("/signup");
      msg = "Password not match";
    } else {
      const paswwordSec = await securePassword(usd.password);
      user = new User({
        username: usd.username,
        email: usd.email,
        phone: usd.phone,
        password: paswwordSec,
        is_admin: 0,
      });
    }

    const userData = await user.save();

    if (userData) {
      sendVerifyMail(usd.username, usd.email, userData._id);
      res.redirect("/login");
      message = "Registration successfull.Please verify your Email";
    } else {
      res.redirect("/signup");
      msg = "registration failed";
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////////LOGIN USER///////

const loginUser = async (req, res, next) => {
  try {
    res.render("login", { message, msg });
    message = null;
    msg = null;
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

//////////LOGIN VERIFICATION///////////

const verifyLogin = async (req, res, next) => {
  try {
    if (
      req.body.email.trim().length == 0 ||
      req.body.password.trim().length == 0
    ) {
      res.redirect("/login");
      msg = "Please fill all the forms";
    } else {
      const email = req.body.email;
      const password = req.body.password;
      const userData = await User.findOne({ email: email });

      if (userData) {
        const passwordHash = await bcrypt.compare(password, userData.password);

        if (passwordHash) {
          if (userData.is_verified == 1) {
            if (userData.is_blocked == 0) {
              req.session.user_id = userData._id;
              console.log(req.session.user_id);
              res.redirect("/loginHome");
            } else {
              res.redirect("/login");
              msg = "Your account has been blocked";
            }
          } else {
            res.redirect("/login");
            msg = "Mail is not verified";
          }
        } else {
          res.redirect("/login");
          msg = "password is incorrect";
        }
      } else {
        res.redirect("/login");
        msg = "user not found";
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

///////LOADING HOME PAGE////////44

const loginHome = async (req, res, next) => {
  let session;
  try {
    if(req.session.user_id){
      console.log('dfghj');
     session = req.session.user_id;
    const banner = await bannerSchema.findOne();
    const userData = await User.findOne({ _id: new Object(session) });
    //if user havn't wallet createing////
    if (userData.wallet === undefined) {
      await User.updateOne({ _id: session }, { $set: { wallet: 0 } });
    }
    if(userData.address.length==0){
      await User.updateOne({_id: session}, {$set: {address: [0]}})
    }
    const products = await productSchema.find({
      unlisted: 0,
      stock: { $gt: 0 },
    });

    if ((products.stock = 0)) {
      message = "Out Of Stock";
    }
      res.render("home", {
        product: products,
        session,
        userData,
        banner,
        message,
      });
    
  }else{
    const banner = await bannerSchema.findOne();
        const products = await productSchema.find({
          unlisted: 0,
          stock: { $gt: 0 },
        });
        if ((products.stock = 0)) {
           message = "Out Of Stock";
    
        } 
        res.render("home", { product: products,session, banner, message });

  }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

///////////LOGOUT////////////

const logOut = async (req, res) => {
  req.session.user_id = null;
  res.redirect("/");
};

///////////ADMIN BLOCKED/////////////

const logOutIn = async (req, res) => {
  req.session.user_id = null;
  res.redirect("/admin/userData");
};

/////////EMAIL VERIFICATION////////////

const verifyMail = async (req, res, next) => {
  try {
    const updateInfo = await User.updateOne(
      { _id: req.query.id },
      { $set: { is_verified: 1 } }
    );

    res.render("emailVerified");
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////////OTP LOGIN///////

const otpLogin = async (req, res, next) => {
  try {
    res.render("otp-login", { message, msg });
    message = null;
    msg = null;
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////////OTP PAGE///////

const otppage = async (req, res, next) => {
  try {
    res.render("otp-page", { message, msg });
    message = null;
    msg = null;
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

//////////OTP GENERATION///////////

function otpgen() {
  OTP = Math.random() * 1000000;
  OTP = Math.floor(OTP);
  return OTP;
}
let otp;

//////////OTP email VERIFICATION///////////

let otpChechMail;
const verifyotpMail = async (req, res, next) => {
  try {
    if (req.body.email.trim().length == 0) {
      res.redirect("/otp-login");
      msg = "Please fill the form";
    } else {
      otpChechMail = req.body.email;
      const userData = await User.findOne({ email: otpChechMail });
      console.log(userData);

      if (userData) {
        if (otpChechMail) {
          if (userData.is_verified == 1) {
            if (userData.is_blocked == 0) {
              res.redirect("/otp-page");
              const mailtransport = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                  user: "codershafinsha@gmail.com",
                  pass: process.env.EMAILPASS,
                },
              });

              otp = otpgen();
              let details = {
                from: "codershafinsha@gmail.com",
                to: otpChechMail,
                subject: "MaleFashion",
                text:
                  otp +
                  " is your Male Fashion  verification code. Do not share OTP with anyone ",
              };
              mailtransport.sendMail(details, (err) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("success");
                }
              });
            } else {
              res.redirect("/otp-login");
              msg = "Your account has been blocked";
            }
          } else {
            res.redirect("/otp-login");
            msg = "Mail is not verified";
          }
        }
      } else {
        res.redirect("/otp-login");
        msg = "user not found";
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

///////LOAD OTP PAGE////////

const otpVerify = async (req, res, next) => {
  try {
    console.log(req.query);
    if (req.query.otp.toString().trim().length == 0) {
      res.redirect("/otp-page");
      msg = "Please Enter OTP";
    } else {
      const OTP = req.query.otp;
      if (otp == OTP) {
        const userData = await User.findOne({ email: otpChechMail });
        req.session.user_id = userData._id;
        console.log(req.session.user_id);
        res.redirect("/");
      } else {
        res.redirect("/otp-page");
        msg = "OTP is incorrect";
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////////////LOAD USER PROFILE PAGE/////////
const userProfile = async (req, res, next) => {
  try {
////Generating order id/////
    const generateOrderId = () => {
      const date = new Date();
      const year = date.getFullYear().toString().substring(2, 4);
      const month = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      const randomStr = Math.random().toString(36).substring(7).toUpperCase();
      const num = Math.floor(Math.random() * 90 + 10);

      const orderId = `MF-${year}${month}${day}-${randomStr}${num}`;
      return orderId;
    }
    const orderId = generateOrderId();
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    req.session.order = null;

    ///message from razorpay///
    if (req.query.message) {
      const messageJSON = req.query.message;
      let messagge = JSON.parse(messageJSON);
      message = messagge.message;
      console.log(messagge);
    }
    const limit = 10;
    const session = req.session.user_id;

    if (session) {
      if (orderStatus == 1) {
        const cart = await cartSchema
          .findOne({ userId: session })
          .populate("item.product");
        const user = await User.findOne({ _id: session });
        let address = req.session.address;
        const orderItems = cart.item.map((item) => {
          return {
            product: item.product._id,
            price: item.price,
            quantity: item.quantity,
          };
        });

        const totalPrice = cart.item.reduce(
          (total, item) => total + item.price,
          0
        );

        const grandTotal = cart.GrandTotal;
        let discount = cart.discount;

        let paymentmethod;
        if (req.query.payment) {
          paymentmethod = req.query.payment;
          if (req.query.wallet) {
            const wallet = user.wallet;
            const updatewallet = wallet - cart.GrandTotal;
            await User.updateOne(
              { _id: session },
              { $set: { wallet: updatewallet } }
            );
          }
        }
        const latestOrder = await orderSchema
          .findOne()
          .sort("-orderCount")
          .exec();
       
        const order = new orderSchema({
          orderId:orderId,
          userId: session,
          item: orderItems,
          address: address,
          totalPrice: totalPrice,
          orderCount: latestOrder ? latestOrder.orderCount + 1 : 1,
          date: new Date(),
          paymentType: paymentmethod,
          grandTotal: grandTotal,
          discount: discount,
        });
        await order.save();
        await cartSchema.deleteMany({ userId: session });
        orderStatus = 0;
      }
      const orders = await orderSchema
        .find({
          userId: session,
          $or: [
            { paymentType: "online" },
            { admin_cancelled: false, user_cancelled: false },
          ],
        })
        .populate("item.product")
        .sort({ date: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();
      const count = await orderSchema.find().countDocuments();
      const userData = await User.findOne({ _id: new Object(session) });

      res.render("userProfile", {
        userData,
        session,
        message,
        orders,
        totalPages: Math.ceil(count / limit),
      });
      message = null;
    } else {
      msg = "Please Login";
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

///////Cancell Order///////
let refunded = false;
const cancellOrder = async (req, res, next) => {
  try {
    const orderId = req.query.orderid;
    const order = await orderSchema.findOne({ _id: orderId });
    await orderSchema.updateOne(
      { _id: orderId },
      { $set: { user_cancelled: true } }
    );
    if (order.is_confirmed == true) {
      // update the stock in the product schema
      for (let item of order.item) {
        const product = await productSchema.findOne({ _id: item.product });
        const newStockQuantity = product.stock + item.quantity;
        await productSchema.updateOne(
          { _id: item.product },
          { $set: { stock: newStockQuantity } }
        );
      }
      if (order.paymentType === "online") {
        let grandTotal = order.grandTotal;
        const userId = order.userId;
        const user = await User.findOne({ _id: userId });
        const wallet = parseFloat(user.wallet) || 0;
        // Add the totalPrice to the user's wallet
        await User.updateOne(
          { _id: userId },
          { $set: { wallet: wallet + grandTotal } }
        );
        refunded = true;
      }
    }

    if (refunded === false) {
      if (order.paymentType === "online") {
        let grandTotal = order.grandTotal;
        const userId = order.userId;
        const user = await User.findOne({ _id: userId });
        const wallet = parseFloat(user.wallet) || 0;
        // Add the totalPrice to the user's wallet
        await User.updateOne(
          { _id: userId },
          { $set: { wallet: wallet + grandTotal } }
        );
      }
    }
    res.redirect("/userProfile");
    message = "Order cancelled successfully";
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

/////Return order////

const returnOrder = async (req, res, next) => {
  try {
    const orderId = req.query.orderid;
    const order = await orderSchema.findOne({ _id: orderId });
    order.return = true;
    await order.save();

    res.redirect("/userProfile");
    message = "Return Request Created";
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////Cancell Return////
const cancellReturn = async (req, res, next) => {
  try {
    const orderId = req.query.orderid;
    const order = await orderSchema.findOne({ _id: orderId });
    order.return = false;
    await order.save();

    res.redirect("/userProfile");
    message = "Return Request Cancelled";
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

//////LOAD USER EDIT PROFILE///////////////

const loadEditProfile = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });
    res.render("editProfile", { userData, session, msg });
    msg = null;
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

/////////EDIT PROFILE/////////

const editProfile = async (req, res, next) => {
  try {
    const data = req.body;
    
    const id = req.session.user_id;
    if (req.file) {
      await User.updateOne(
        { _id: new Object(id) },
        { $set: { image: req.file.filename } }
      );
    }
    if (!data.username && !data.address && !data.city && !data.district  && !data.state   && !data.country) {
      res.redirect('/editProfile')
      msg = 'Fill all the fields'
  } else if (!data.username || data.username.trim().length < 3) {
      res.redirect('/editProfile')
      msg = 'Enter valid name'
  } else if (!data.address || data.address.trim().length < 3) {
      res.redirect('/editProfile')
      msg = 'Enter Valid Address'
  } else if (!data.city || data.city.trim().length < 3) {
      res.redirect('/editProfile')
      msg = 'Enter Valid City'
  } else if (!data.district || data.district.trim().length < 3) {
      res.redirect('/editProfile')
      msg = 'Enter Valid District'
  } else if (!data.state || data.state.trim().length < 3) {
      res.redirect('/editProfile')
      msg = 'Enter Valid State'
  }  else if (regex_mobile.test(data.phone) == false) {
      res.redirect('/editProfile')
      msg = 'Enter valid phone number'
  }
        else {
      await User.updateOne(
        { _id: mongoose.Types.ObjectId(id) },
        {
          $set: {
            address: {
              address: data.address,
              city: data.city,
              zip: data.zip,
              district: data.district,
              state: data.state,
            },
          },
        }
      );

      const newData = await User.updateOne(
        { _id: new Object(id) },
        {
          $set: {
            username: data.username,
            email: data.email,
            phone: data.phone,
          },
        }
      );
      res.redirect("/userProfile");
      message = "Profile updated successfully";
    }
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

const loadChangePassword = async (req, res, next) => {
  const session = req.session.user_id;
  const userData = await User.findOne({ _id: new Object(session) });

  try {
    res.render("changePassword", { msg, session, userData });
    msg = null;
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

/////////////CHANGE PASSWORD/////////

const changePassword = async (req, res, next) => {
  try {
    const newPassword = req.body.newPassword;
    const rePassword = req.body.Repassword;
    const id = req.session.user_id;
    const password = await User.findOne({ _id: new Object(id) });
    const passwordHash = await bcrypt.compare(
      req.body.oldPassword,
      password.password
    );
    if (passwordHash) {
      if (regex_password.test(newPassword) == false) {
        res.redirect("/changePassword");
        msg = "Use strong password";
      } else {
        if (newPassword == rePassword) {
          const paswwordSec = await securePassword(newPassword);
          await User.updateOne(
            { _id: new Object(id) },
            { password: paswwordSec }
          );
          res.redirect("/userProfile");
          message = "Password changed successfully";
        } else {
          res.redirect("/changePassword");
          msg = "Password not match";
        }
      }
    } else {
      msg = "Current password is incorrend";
      res.redirect("/changePassword");
    }
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

///Load Address///

const address = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });

    res.render("address", { session, userData,message });
    message=null;
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

const getNewAddress = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });

    res.render("addNewAddress", { session, userData });
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

/////AddNewAddress///////

const addNewAddress = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const data = req.body;
    const userData = await User.findOne({ _id: new Object(session) });
    userData.address.push(data);
    await userData.save();

    res.redirect("/address");
  } catch (error) {
    console.log(error);
    next(error.message);
  }
};

//////productView////////
const productView = async (req, res, next) => {
  const session = req.session.user_id;
  const proid = req.query.id;

  try {
    const product = await productSchema.findOne({
      _id: mongoose.Types.ObjectId(proid),
    });
    const userData = await User.findOne({ _id: new Object(session) });

    res.render("productView", { product, session, userData });
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

///////CART Loading///////
let discountRate = 0;
let maxAmt = 0;
const addtocart = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });
    const userCart = await cartSchema.findOne({ userId: session });

    await cartSchema.findOne({ userId: session }).populate("item.product");

    if (userCart) {
      const cart = await cartSchema
        .findOne({ userId: session })
        .populate("item.product");
      if (cart.item.length === 0) {
        let total = 0;
        await cartSchema.updateOne(
          { userId: session },
          {
            $set: {
              subtotal: total,
              totalPrice: total,
              discount: total,
              is_used: false,
            },
          }
        );
      } else {
        let totalPrice = 0;
        if (cart && cart.item != null) {
          cart.item.forEach((value) => {
            totalPrice += value.price * value.quantity;
          });
        }
        let discount = 0;
        if (cart && cart.coupons && cart.coupons.length > 0) {
          const amt = cart.coupons[0].minAmount;
          maxAmt = cart.coupons[0].maxAmt;
          if (cart.is_used === true) {
            if (totalPrice >= amt) {
              discountRate = cart.coupons[0].discount;
              let disc = (totalPrice * discountRate) / 100;
              if (disc > maxAmt) {
                discount = maxAmt;
              } else {
                discount = disc;
              }
            } else {
              discount = 0;
            }
          }
        } else {
          discount = 0;
        }
        await cartSchema.updateOne(
          { userId: session },
          { $set: { discount: discount } }
        );
        let total = 0;
        const cartt = await cartSchema.findOne({ userId: session });
        if (cartt.discount) {
          total = totalPrice - cartt.discount;
        } else {
          total = totalPrice;
        }
        await cartSchema.updateOne(
          { userId: session },
          { $set: { totalPrice: totalPrice, subtotal: total } }
        );
        const cartProducts = await cartSchema
          .findOne({ userId: session })
          .populate("item.product");
        const coupons = await couponSchema.find();
        console.log(coupons);
        res.render("addToCart", {
          session,
          userData,
          cartProducts,
          totalPrice,
          coupons,
          mess,
          msg,
          message,
        });
        message = null;
        msg = null;
      }
    } else {
      let totalPrice = 0;
      const cartProducts = await cartSchema
        .findOne({ userId: session })
        .populate("item.product");

      const coupons = await couponSchema.find();
      res.render("addToCart", {
        session,
        userData,
        cartProducts,
        totalPrice,
        coupons,
        mess,
        msg,
        message,
      });
    }
    msg = null;
    message = null;
    mess = null;
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

//////Adding to Cart//////

const addingToCart = async (req, res, next) => {
  try {
    const product_Id = req.query.id;
    const user_Id = req.session.user_id;
    const product = await productSchema.findOne({
      _id: new Object(product_Id),
    });
    const userCart = await cartSchema.findOne({ userId: user_Id });
    const cartCount = await cartSchema.findOne({
      userId: user_Id,
      "item.product": product_Id,
    });
    if (userCart) {
      const itemIndex = userCart.item.findIndex(
        (item) => item.product._id.toString() === product_Id
      );
      if (itemIndex >= 0) {
        if (cartCount) {
          const item = cartCount.item.find(
            (item) => item.product.toString() === product_Id
          );
          if (item) {
            if (item.quantity >= product.stock) {
              const msg = "item out of stock";
              return res.redirect("/addToCart");
            } else {
              await cartSchema.updateOne(
                { userId: user_Id, "item.product": product_Id },
                {
                  $inc: { "item.$.quantity": 1 },
                }
              );
            }

            const cartvalue = await cartSchema.findOne({
              userId: user_Id,
              "item.product": product_Id,
            });
            const value = cartvalue.item.find(
              (item) => item.product.toString() === product_Id
            );
            const prototal = value.price * value.quantity;
            await cartSchema.updateOne(
              { userId: user_Id, "item.product": product_Id },
              {
                $set: { "item.$.total": prototal },
              }
            );
          }
        }
      } else {
        if (product.stock > 0) {
          await cartSchema.updateOne(
            { userId: user_Id },
            {
              $push: {
                item: {
                  product: product_Id,
                  price: product.price,
                  quantity: 1,
                },
              },
            }
          );

          const cartvalue = await cartSchema.findOne({
            userId: user_Id,
            "item.product": product_Id,
          });
          const value = cartvalue.item.find(
            (item) => item.product.toString() === product_Id
          );
          const prototal = value.price * value.quantity;
          await cartSchema.updateOne(
            { userId: user_Id, "item.product": product_Id },
            {
              $set: { "item.$.total": prototal },
            }
          );
        } else {
          const msg = "item out of stock";
          return res.redirect("/addToCart");
        }
      }
    } else {
      if (product.stock > 0) {
        await cartSchema.insertMany({
          userId: user_Id,
          item: [
            {
              product: product_Id,
              price: product.price,
              quantity: 1,
              total: product.price,
            },
          ],
        });
      } else {
        let msg = "item out of stock";
        return res.redirect("/addToCart");
      }
    }

    return res.redirect("/addToCart");
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

const deleteCart = async (req, res, next) => {
  try {
    const id = req.query.id;
    const userId = req.session.user_id;
    const cartt = await cartSchema.findOne({
      userId: userId,
    });
    await cartSchema.updateOne({ userId: userId }, { $set: { discount: 0 } });
    await cartSchema.updateOne(
      { userId: new Object(userId) },
      { $pull: { item: { _id: new Object(id) } } }
    );
    const cart = await cartSchema.findOne({
      userId: userId,
    });

    if (cart.item.length === 0) {
      await cartSchema.deleteOne({
        userId: userId,
      });
    }
    res.redirect("/addToCart");
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};
////Increment cart///////

const incrementCart = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const itemid = req.query.id;
    const cartCount = await cartSchema.findOne({ "item.product": itemid });
    let item = cartCount.item.filter((value) => {
      return value.product == itemid;
    });
    const product = await productSchema.findOne({ _id: itemid });

    if (item) {
      if (item[0].quantity >= product.stock) {
        res.status(400).send({ error: "Item out of stock" });
      } else {
        const a = await cartSchema.updateOne(
          { userId: userId, "item.product": itemid },
          { $inc: { "item.$.quantity": 1 } }
        );
        const updatedItem = await cartSchema.findOne({
          "item.product": itemid,
        });
        let total = 0;
        let item = updatedItem.item.filter((value) => {
          total += value.price * value.quantity;
          return value.product == itemid;
        });
        const prototal = item[0].price * item[0].quantity;
        await cartSchema.findOneAndUpdate(
          { userId: userId, "item.product": itemid },
          {
            $set: {
              "item.$.total": prototal,
            },
          }
        );

        await cartSchema.findOneAndUpdate(
          { userId: userId },
          {
            $set: {
              totalPrice: total,
            },
          }
        );
        let discount = 0;
        if (updatedItem.is_used == true) {
          let disc = (total * discountRate) / 100;
          if (disc > maxAmt) {
            discount = maxAmt;
          } else {
            discount = disc;
          }
          await cartSchema.updateOne(
            { userId: userId },
            { $set: { discount: discount } }
          );
        }

        const value = await cartSchema.findOne({ userId: userId });
        let totalPrice = value.totalPrice;
        let discounts = value.discount;
        let subtotal;
        if (typeof value.discount === "number") {
          subtotal = totalPrice - value.discount; // changing  obj to number
        } else {
          subtotal = totalPrice;
        }
        await cartSchema.findOneAndUpdate(
          { userId: userId },
          {
            $set: {
              subtotal: subtotal,
            },
          }
        );
        res.status(200).send({
          quantity: item[0].quantity,
          index: itemid,
          subtotal,
          totalPrice,
          prototal,
          discounts,
        });
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
    res.status(500).send({ error: "Internal server error" });
  }
};

///////DecrementCart/////////

const decrementCart = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const itemid = req.query.id;

    const cartCount = await cartSchema.findOne({ "item.product": itemid });

    let item = cartCount.item.filter((value) => {
      return value.product == itemid;
    });
    const product = await productSchema.findOne({ _id: itemid });

    if (item) {
      if (item[0].quantity <= 1) {
        res.status(400).send({ error: "Add atleast one item" });
      } else {
        const a = await cartSchema.updateOne(
          { userId: userId, "item.product": itemid },
          { $inc: { "item.$.quantity": -1 } }
        );
        const updatedItem = await cartSchema.findOne({
          "item.product": itemid,
        });
        let total = 0;
        let item = updatedItem.item.filter((value) => {
          total += value.price * value.quantity;
          return value.product == itemid;
        });
        const prototal = item[0].price * item[0].quantity;
        await cartSchema.findOneAndUpdate(
          { userId: userId, "item.product": itemid },
          {
            $set: {
              "item.$.total": prototal,
            },
          }
        );

        await cartSchema.findOneAndUpdate(
          { userId: userId },
          {
            $set: {
              totalPrice: total,
            },
          }
        );
        const updateCart = await cartSchema.findOne({ userId: userId });
        console.log(updateCart);
        let discount;
        if (updateCart && updateCart.coupons && updateCart.coupons.length > 0) {
          const amt = updateCart.coupons[0].minAmount;
          if (updateCart.totalPrice >= amt) {
            discount = (total * discountRate) / 100;
          } else {
            discount = 0;
          }
          if (discount > maxAmt) {
            discount = maxAmt;
          }
        }
        await cartSchema.updateOne(
          { userId: userId },
          { $set: { discount: discount } }
        );

        const value = await cartSchema.findOne({ userId: userId });
        let totalPrice = value.totalPrice;
        let discounts = value.discount;

        let subtotal;
        if (typeof value.discount === "number") {
          subtotal = totalPrice - value.discount; // changing  obj to number
        } else {
          subtotal = totalPrice;
        }
        await cartSchema.findOneAndUpdate(
          { userId: userId },
          {
            $set: {
              subtotal: subtotal,
            },
          }
        );

        res.status(200).send({
          quantity: item[0].quantity,
          index: itemid,
          subtotal,
          totalPrice,
          prototal,
          discounts,
        });
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
    res.status(500).send({ error: "Internal server error" });
  }
};

///////Wishlist//////

const wishList = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });

    const wishlist = userData.wishlist;
    res.render("wishList", { session, userData, msg, wishlist });
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

const addingTOWishlist = async (req, res, next) => {
  try {
    const productId = req.query.id;
    const userId = req.session.user_id;

    const product = await productSchema.findOne({
      _id: mongoose.Types.ObjectId(productId),
    });
    const user = await User.findOne({ _id: new Object(userId) });

    const itemIndex = user.wishlist.findIndex((item) =>
      item._id.equals(mongoose.Types.ObjectId(productId))
    );
    console.log(itemIndex);
    if (itemIndex >= 0) {
      // item already exists in wishlist
      res.redirect("/wishList");
    } else {
      // item does not exist in wishlist
      await User.updateOne({ _id: user._id }, { $push: { wishlist: product } });
      res.redirect("/wishList");
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

/////deleat wishlist////

const deleteWishlist = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const proid = req.query.id;
    await User.updateOne(
      { _id: new Object(userId) },
      { $pull: { wishlist: { _id: mongoose.Types.ObjectId(proid) } } }
    );

    res.redirect("/wishList");
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};
////Checkout/////

const checkout = async (req, res) => {
  const index = req.query.index;
  const session = req.session.user_id;
  const userData = await User.findOne({ _id: new Object(session) });
  const cart = await cartSchema
    .findOne({ userId: session })
    .populate("item.product");
  addressCount = userData.address[index];
  let address = userData.address;
  if (cart != null) {
    if (cart.item) {
      res.render("checkout", {
        session,
        cart,
        userData,
        addressCount,
        address,
      });
    }
  } else {
    res.redirect("/addToCart");
    msg = "Your cart is empty";
  }
};

//////Delete Address/////


const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const index = req.query.index;
    const userData = await User.findOne({ _id: new Object(userId) });
    console.log(userData.address[index]);
    // Remove the address at the specified index position
    userData.address.splice(index, 1);

    // Save the updated userData to the database
    await userData.save();
    message='Address Deleted'
    res.redirect("/address");
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};


/////Coupon Checking/////

const couponApply = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const coupon = req.body.Coupon;
    const cpn = await couponSchema.findOne({ couponId: coupon });
    if (cpn === null) {
      message = "Invalid Coupon Code";
      res.redirect("/addToCart");
    } else {
      if (cpn.expiryDate < Date.now()) {
        message = "Coupon Expired";
        res.redirect("/addToCart");
        //  expired coupon
      } else {
        const cart = await cartSchema.findOne({ userId: session });
        let discount = 0;
        if (cart.is_used === false) {
          let totalPrice = cart.totalPrice;
          if (cpn.minItems >= 1) {
            if (totalPrice >= cpn.minAmount) {
              discountRate = cpn.discount;
              maxAmt = cpn.maxAmt;
              let disc = (totalPrice * discountRate) / 100;
              if (disc > maxAmt) {
                discount = maxAmt;
              } else {
                discount = disc;
              }
              let count = cpn.minItems - 1;
              // Update cart total price
              await cartSchema.updateOne(
                { userId: session },
                {
                  $set: {
                    discount: discount,
                    minItems: count,
                    is_used: true,
                  },
                  $push: {
                    coupons: cpn,
                  },
                }
              );
              await couponSchema.updateOne(
                { couponId: coupon },
                { minItems: count }
              );
              mess = "Coupn Applied";
              res.redirect("/addToCart");
            } else {
              message = "Not Applicable";
              res.redirect("/addToCart");
            }
          } else {
            message = "Coupon Not Availabe";
            res.redirect("/addToCart");
          }
        } else {
          message = "Coupon already applied";
          res.redirect("/addToCart");
        }
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////Payments/////place order
let messa = "";
let mssg;
const payment = async (req, res, next) => {
  try {
    const address = req.body;
    const session = req.session.user_id;
    req.session.address = address;

    const userData = await User.findOne({ _id: new Object(session) });
    const pro = await cartSchema.findOne({ userId: session });
    let tax = pro.subtotal * (12 / 100);
    let Total = pro.subtotal + tax + 40;
    Total = Math.round(Total);
    await cartSchema.updateOne(
      { userId: session },
      {
        $set: {
          GrandTotal: Total,
        },
      }
    );

    const wallet = userData.wallet;
    if (wallet < pro.GrandTotal) {
      mssg = "No Sufficient Balance";
    }
    messa = req.query.message;
    const order = req.session.order;
    res.render("paymentPage", {
      Total,
      tax,
      session,
      userData,
      message,
      messa,
      order,
      mssg,
    });
    req.session.order = null;
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

//////order placed///////

const orderPlaced = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const payment = req.body;
    const cart = await cartSchema.findOne({ userId: session });
    const grandTotal = cart.GrandTotal;
    if (payment.radiovalue == "cod") {
      orderStatus = 1;
      res.redirect("/userProfile?payment=cod");
      message = "Your order started shipping";
    } else if (payment.radiovalue == "online") {
      {
        const returnURL = `https://malefashion.shop/success?total=${grandTotal}`;

        const create_payment_json = {
          intent: "sale",
          payer: {
            payment_method: "paypal",
          },
          redirect_urls: {
            return_url: returnURL,
            cancel_url:
              "https://malefashion.shop/paymentPage?message=Payment%20cancelled",
          },
          transactions: [
            {
              item_list: {
                items: [
                  {
                    name: "MALE FASHION ",
                    sku: "001",
                    price: grandTotal,
                    currency: "USD",
                    quantity: 1,
                  },
                ],
              },
              amount: {
                currency: "USD",
                total: grandTotal,
              },
              description: "Thank you for your order",
            },
          ],
        };
        paypal.payment.create(create_payment_json, function (error, payment) {
          if (error) {
            throw error;
          } else {
            for (let i = 0; i < payment.links.length; i++) {
              if (payment.links[i].rel === "approval_url") {
                res.redirect(payment.links[i].href);
              }
            }
          }
        });
      }
    } else if (payment.radiovalue == "wallet") {
      const user = await User.findOne({ _id: session });
      const wallet = user.wallet;
      if (wallet >= cart.GrandTotal) {
        orderStatus = 1;

        res.redirect("/userProfile?payment=online&wallet=wallet");
        message = "Your order started shipping";
      } else {
        mssg = "No Sufficient Balance";
        res.redirect("/paymentPage");
        message=null;
      }
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

/////razorpay success////
const razorpayConfirm = async (req, res) => {
  const session = req.session.user_id;
  const cart = await cartSchema.findOne({ userId: session });
  const grandTotal = cart.GrandTotal;
  try {
    var options = {
      amount: grandTotal * 100,
      currency: "INR",
      receipt: "order_rcptid_11qsasdasdasd",
    };
    const order = await instance.orders.create(options);
    res.json({ order });
  } catch (error) {}
};

const razorpay = async (req, res, next) => {
  const session = req.session.user_id;
  const cart = await cartSchema
    .findOne({ userId: session })
    .populate("item.product");
  const user = await User.findOne({ _id: session });
  let address = req.session.address;
  const orderItems = cart.item.map((item) => {
    return {
      product: item.product._id,
      price: item.price,
      quantity: item.quantity,
    };
  });
  const totalPrice = cart.item.reduce((total, item) => total + item.price, 0);

  const grandTotal = cart.GrandTotal;
  let discount = cart.discount;

  let paymentmethod = "online";
  const latestOrder = await orderSchema.findOne().sort("-orderCount").exec();
  ///Generating order id/////
  const generateOrderId = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substring(2, 4);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    const randomStr = Math.random().toString(36).substring(7).toUpperCase();
    const num = Math.floor(Math.random() * 90 + 10);

    const orderId = `MF-${year}${month}${day}-${randomStr}${num}`;
    return orderId;
  }
  const orderId = generateOrderId();
  const order = new orderSchema({
    orderId:orderId,
    userId: session,
    item: orderItems,
    address: address,
    totalPrice: totalPrice,
    orderCount: latestOrder ? latestOrder.orderCount + 1 : 1,
    date: new Date(),
    paymentType: paymentmethod,
    grandTotal: grandTotal,
    discount: discount,
  });
  await order.save();
  await cartSchema.deleteMany({ userId: session });
  message='Order Placed'
  res.redirect("/userProfile");
};

////paypal  rout  from user_router///

const createPayment = async (req, res, next) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  let total = req.query.total;
  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: total,
        },
      },
    ],
  };

  try {
    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      function (error, payment) {
        if (error) {
          console.log(error.response);
          throw error;
        } else {
          console.log(JSON.stringify(payment));
          orderStatus = 1;
          res.redirect("/userProfile?payment=online");
          message = "Your order started shipping";
        }
      }
    );
  } catch (error) {
    console.log(error.response);
    next(error.message);
    throw error;
  }
};

///add money to wallet////
const addmoney = async (req, res, next) => {
  const session = req.session.user_id;
  const amount = parseFloat(req.body.amount);
  try {
    const returnURL = `https://malefashion.shop/addtowallet?total=${amount}&session=${session}`;

    const create_payment_json = {
      intent: "SALE",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: returnURL,
        cancel_url:
          "https://malefashion.shop/userProfile?message=Payment%20cancelled",
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: "MALE FASHION ",
                sku: "001",
                price: amount,
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: amount,
          },
          description: "Thank you for your order",
        },
      ],
    };
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        throw error;
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            res.redirect(payment.links[i].href);
          }
        }
      }
    });
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////rout from user_router///

const addtowallet = async (req, res, next) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  let total = req.query.total;
  let session = req.query.session;
  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: total,
        },
      },
    ],
  };

  try {
    //add money to wallet//
    const user = await User.findOne({ _id: session });
    const wallet = parseFloat(user.wallet) || 0;
    // Add the totalPrice to the user's wallet
    await User.updateOne(
      { _id: session },
      { $set: { wallet: wallet + Number(total) } }
    );

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      function (error, payment) {
        if (error) {
          console.log(error.response);
          throw error;
        } else {
          console.log(JSON.stringify(payment));
          res.redirect("/userProfile?wallet=" + total);
          message = "Money Added";
        }
      }
    );
  } catch (error) {
    console.log(error.response);
    next(error.message);
    throw error;
  }
};

const ordersView = async (req, res, next) => {
  try {
    const session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });
    const orderId = req.query.orderid;
    const orders = await orderSchema
      .findOne({ _id: orderId })
      .populate("item.product");
    console.log(orders);
    res.render("ordersView", { session, orders, userData, orderId });
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

//////shopPage//////

const shopPage = async (req, res, next) => {
  try {
    let search = "";

    let session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });
    const category = await Category.find();
    const currentPage = parseInt(req.query.page) || 1;
    //number of product per page
    const limit = 6;
    const offset = (currentPage - 1) * limit;
    const products = await productSchema
      .find({ unlisted: 0 })
      .skip(offset)
      .limit(limit);
    //count total
    const totalCount = await productSchema.countDocuments(products);
    const totalPages = Math.ceil(totalCount / limit);
    if (userData) {
      res.render("shopPage", {
        product: products,
        session,
        category,
        msg,
        userData,
        currentPage,
        totalPages,
      });
    } else {
      res.render("shopPage", {
        product: products,
        session,
        category,
        msg,
        currentPage,
        totalPages,
      });
    }
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

/////Filter/////
const filterPrice = async (req, res, next) => {
  try {
    let product;
    let products = [];
    let Categorys;
    let Data = [];

    const { categorys, search, filterprice, sort } = req.body;
    const sortOption = sort === "priceHighToLow" ? { price: -1 } : { price: 1 };
    console.log(search);
    const query = {
      unlisted: 0,
    };
    if (search) {
      query.$or = [
        { brand: { $regex: ".*" + search + ".*", $options: "i" } },
        { title: { $regex: ".*" + search + ".*", $options: "i" } },
      ];
    }
    if (filterprice && filterprice.length > 0) {
      if (filterprice.length == 2) {
        query.price = {
          $gte: Number(filterprice[0]),
          $lte: Number(filterprice[1]),
        };
      } else {
        query.price = { $gte: Number(filterprice[0]) };
      }
    }

    if (categorys && categorys.length > 0) {
      query.category = { $in: categorys };
    }
    const totalCount = await productSchema.countDocuments(query);
    product = await productSchema
      .find(query)
      .populate("category")
      .sort(sortOption);

    Categorys = categorys.filter((value) => {
      return value !== null;
    });

    if (Categorys[0]) {
      Categorys.forEach((element, i) => {
        products[i] = product.filter((value) => {
          return value.category == element;
        });
      });
      products.forEach((value, i) => {
        Data[i] = value.filter((v) => {
          return v;
        });
      });
    } else {
      Data[0] = product;
    }
    res.json({ Data });
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

////contactus//

const contactus = async (req, res, next) => {
  try {
    let session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });

    res.render("contactus", { session, userData,msg,message });
    msg=null
    message=null
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

const sendMessage = async (req, res) => {
  try {
      let messageBody=req.body
      if(messageBody.name==undefined||messageBody.message==undefined){
        res.redirect('back')
        const mailtransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'codershafinsha@gmail.com',
                pass: process.env.EMAILPASS
            },
        });
        let details = {
            from: messageBody.email,
            to: "codershafinsha@gmail.com",
            subject: "MaleFashion Subscription",
            text:`
            Email: ${messageBody.email}`
        }
        mailtransport.sendMail(details, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("success");
            }
        })
      }
      if (req.body.name.trim().length == 0 || req.body.email.trim().length == 0 || req.body.message.trim().length == 0) {
          res.redirect('/contactus')
          msg = 'Please fill the fields'
      } else {
          if (messageBody) {
              res.redirect('/contactus')
              message = 'Message Sent'
              const mailtransport = nodemailer.createTransport({
                  host: 'smtp.gmail.com',
                  port: 465,
                  secure: true,
                  auth: {
                      user: 'codershafinsha@gmail.com',
                      pass: process.env.EMAILPASS
                  },
              });
              let details = {
                  from: messageBody.email,
                  to: "codershafinsha@gmail.com",
                  subject: "MaleFashion User",
                  text:`
                  Name: ${messageBody.name}
                  Email: ${messageBody.email}
                  Message: ${messageBody.message}`
              }
              mailtransport.sendMail(details, (err) => {
                  if (err) {
                      console.log(err);
                  } else {
                      console.log("success");
                  }
              })
          }
      }

  } catch (error) {
      console.log(error.message);
  }
}
/////returnPolicy////
const returnPolicy = async (req, res, next) => {
  try {
    let session = req.session.user_id;
    const userData = await User.findOne({ _id: new Object(session) });

    res.render("returnPolicy", { session, userData });
  } catch (error) {
    console.log(error.message);
    next(error.message);
  }
};

module.exports = {
  userSignup,
  insertUser,
  verifyMail,
  loginUser,
  verifyLogin,
  loginHome,
  logOut,
  logOutIn,
  otpLogin,
  verifyotpMail,
  otppage,
  otpVerify,
  productView,
  addtocart,
  addingToCart,
  deleteCart,
  incrementCart,
  decrementCart,
  checkout,
  userProfile,
  loadEditProfile,
  editProfile,
  address,
  getNewAddress,
  addNewAddress,
  deleteAddress,
  payment,
  orderPlaced,
  ordersView,
  loadChangePassword,
  changePassword,
  cancellOrder,
  returnOrder,
  cancellReturn,
  shopPage,
  wishList,
  addingTOWishlist,
  deleteWishlist,
  filterPrice,
  couponApply,
  createPayment,
  contactus,
  addmoney,
  addtowallet,
  razorpay,
  razorpayConfirm,
  sendMessage,
  returnPolicy
};
