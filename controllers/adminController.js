const userSchema = require("../models/userModel");
const categorySchema = require("../models/categoryModel");
const productSchema = require("../models/productModel");
const orderSchema = require("../models/orderModel");
const couponSchema = require("../models/couponModel");
const salesSchema = require("../models/salesReport");
const bannerSchema = require("../models/bannerModel");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const swal = require("sweetalert2");
const moment = require("moment");
const bcrypt = require("bcrypt");
const { CURSOR_FLAGS } = require("mongodb");
const nodemailer = require("nodemailer");

let msg;
let message;
let messag;

////////LOGIN PAGE LODING////////////

const loginLoad = async (req, res) => {
  res.render("login", { msg });
  msg = null;
};

/////////////ADMIN LOGIN////////////////////

const adminLogin = async (req, res) => {
  try {
    const adminMail = req.body.email;
    const pass = req.body.password;
    const adminData = await userSchema.findOne({ email: adminMail });

    if (adminMail.trim().length == 0 || pass.trim().length == 0) {
      res.redirect("/admin");
      msg = "Please fill all the forms";
    } else {
      if (adminData) {
        const comparePassword = await bcrypt.compare(pass, adminData.password);
        if (comparePassword) {
          if (adminData.is_admin == 1) {
            req.session.admin_id = adminData._id;
            res.redirect("/admin/home");
          } else {
            res.redirect("/admin");
            msg = "You are not an admin";
          }
        } else {
          res.redirect("/admin");
          msg = "Incorrect password";
        }
      } else {
        res.redirect("/admin");
        msg = "Incorrect email";
      }
    }
  } catch (error) {
    console.log(error);
  }
};

///////////LOADIN HOME PAGE/////////////

const loadAdminHome = async (req, res) => {
  try {
    const users = await userSchema.find();
    const usersLength = users.length;
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 7
    );
    const yearAgo = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate()
    );

    const dailySalesReport = await salesSchema.aggregate([
      { $match: { date: { $gte: today } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalSales" },
          totalItemsSold: { $sum: "$totalItemsSold" },
        },
      },
    ]);

    const weeklySalesReport = await salesSchema.aggregate([
      { $match: { date: { $gte: weekAgo } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalSales" },
          totalItemsSold: { $sum: "$totalItemsSold" },
        },
      },
    ]);

    const yearlySalesReport = await salesSchema.aggregate([
      { $match: { date: { $gte: yearAgo } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalSales" },
          totalItemsSold: { $sum: "$totalItemsSold" },
        },
      },
    ]);
    ///lineChart////
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Number of days in the month

    const monthlyStart = new Date(currentYear, currentMonth, 1).toLocaleString(
      "en-US",
      { timeZone: "Asia/Kolkata" }
    );
    const monthlyEnd = new Date(currentYear, currentMonth, daysInMonth);

    const monthlySalesData = await salesSchema.find({
      date: {
        $gte: monthlyStart,
        $lte: monthlyEnd,
      },
    });
    const dailySalesDetails = [];

    for (let i = 2; i <= daysInMonth + 1; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const salesOfDay = monthlySalesData.filter((order) => {
        return new Date(order.date).toDateString() === date.toDateString();
      });
      const totalSalesOfDay = salesOfDay.reduce((total, order) => {
        return total + order.totalSales;
      }, 0);
      let productCountOfDay = 0;
      salesOfDay.forEach((order) => {
        productCountOfDay += order.totalItemsSold;
      });

      dailySalesDetails.push({
        date: date,
        totalSales: totalSalesOfDay,
        totalItemsSold: productCountOfDay,
      });
    }

    const order = await orderSchema.aggregate([
      {
        $group: {
          _id: "$paymentType",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          codCount: {
            $sum: {
              $cond: { if: { $eq: ["$_id", "cod"] }, then: "$count", else: 0 },
            },
          },
          onlineCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$_id", "online"] },
                then: "$count",
                else: 0,
              },
            },
          },
          walletCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$_id", "wallet"] },
                then: "$count",
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          codCount: 1,
          onlineCount: 1,
          walletCount: 1,
        },
      },
    ]);

    res.render("home", {
      dailySalesReport,
      weeklySalesReport,
      yearlySalesReport,
      message,
      usersLength,
      dailySalesDetails,
      order,
    }),
      (message = null);
  } catch (error) {
    console.log(error);
  }
};

/////orders control page/////

const orders = async (req, res) => {
  try {
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 10;
    const orders = await orderSchema
      .find()
      .populate("userId")
      .populate("item.product")
      .sort({ orderCount: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
    const count = await orderSchema.find().countDocuments();
    res.render("orders", {
      orders,
      totalPages: Math.ceil(count / limit),
      page,
      message,
      messag,
    });
    message = null;
    messag = null;
  } catch (error) {
    console.log(error);
  }
};

////sales report////

const loadSalesPage = async (req, res) => {
  try {
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 10;
    let filter = "";
    if (req.query.filter) {
      filter = req.query.filter;
    }

    let sales = [];
    let count = 0;
    if (filter === "all") {
      sales = await salesSchema
        .find({})
        .populate("userId")
        .sort({date:-1})
        .limit(limit)
        .skip((page - 1) * limit)
        .exec()
      count = await salesSchema.countDocuments({});
    } else if (filter === "weekly") {
      const startOfWeek = moment().startOf("week").toDate();
      const endOfWeek = moment().endOf("week").toDate();
      sales = await salesSchema
        .find({
          date: {
            $gte: startOfWeek,
            $lte: endOfWeek,
          },
        })
        .populate("userId")
        .sort({date:-1})
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();
      count = await salesSchema.countDocuments({
        date: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      });
    } else if (filter === "yearly") {
      const startOfYear = moment().startOf("year").toDate();
      const endOfYear = moment().endOf("year").toDate();

      sales = await salesSchema
        .find({
          date: {
            $gte: startOfYear,
            $lte: endOfYear,
          },
        })
        .populate("userId")
        .sort({date:-1})
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();
      count = await salesSchema.countDocuments({
        date: {
          $gte: startOfYear,
          $lte: endOfYear,
        },
      });
    } else {
      sales = await salesSchema
        .find()
        .populate("userId")
        .sort({date:-1})
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();
      count = await salesSchema.countDocuments({});
    }

    res.render("salesReport", {
      sales,
      totalPages: Math.ceil(count / limit),
      count,page
    });
  } catch (error) {
    console.log(error.message);
  }
};

/////////////LOGOUT/////////////////

const adminLogOut = async (req, res) => {
  try {
    req.session.admin_id = null;
    res.redirect("/admin");
  } catch (error) {
    console.log(error);
  }
};

///////////LOAD USERDATA/////////////

const loadUserData = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 5;

    const userData = await userSchema
      .find({
        is_admin: 0,
        $or: [
          { username: { $regex: ".*" + search + ".*", $options: "i" } },
          { email: { $regex: ".*" + search + ".*", $options: "i" } },
        ],
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await userSchema
      .find({
        is_admin: 0,
        $or: [
          { username: { $regex: ".*" + search + ".*", $options: "i" } },
          { email: { $regex: ".*" + search + ".*", $options: "i" } },
        ],
      })
      .countDocuments();

    for (i = 0; i < userData.length; i++) {
      if (userData[i].is_verified == 0) {
        userData[i].Status = "not verified";
      } else if (userData[i].is_blocked == 0) {
        userData[i].Status = "Active";
      } else {
        userData[i].Status = "Blocked";
      }
    }
    res.render("userData", {
      users: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      page,
    });
  } catch (error) {
    console.log(error);
  }
};

/////////////BLOCK USER///////////////

const blockUser = async (req, res) => {
  try {
    const id = req.query.id;
    await userSchema.updateOne(
      { _id: new Object(id) },
      { $set: { is_blocked: 1 } }
    );
    res.redirect("/logoutIn");
  } catch (error) {
    console.log(error);
  }
};

//////////UNBLOCK USER////////////

const unblockUser = async (req, res) => {
  try {
    const id = req.query.id;
    const user = await userSchema.updateOne(
      { _id: new Object(id) },
      { $set: { is_blocked: 0 } }
    );
    res.redirect("/admin/userData");
  } catch (error) {
    console.log(error);
  }
};

////////////LOAD BANNER SHOWING PAGE/////////

const bannersPage = async (req, res) => {
  try {
    const banners = await bannerSchema.find();
    res.render("banners", { message, banners, msg });
    (msg = null), (message = null);
  } catch (error) {
    console.log(error.message);
  }
};

////////LOAD ADD BANNER PAGE////////

const loadAddBanner = async (req, res) => {
  try {
    res.render("addBanner");
  } catch (error) {
    console.log(error.message);
  }
};

//////////ADD BANNER//////////

const addBanner = async (req, res) => {
  try {
    const ban = req.body;
    let image = req.files.map((file) => file);
    for (let i = 0; i < image.length; i++) {
      let path = image[i].path;
      sharp(path)
        .rotate()
        .resize(1920, 800)
        .toFile("public/img/banner/" + image[i].filename);
    }

    const old = await bannerSchema.find();
    if (old == null || old.length == 0) {
      const banner = new bannerSchema({
        heading1: ban.heading1,
        heading2: ban.heading2,
        heading3: ban.heading3,
        description1: ban.description1,
        description2: ban.description2,
        description3: ban.description3,
        image: req.files.map((file) => file.filename),
      });

      await banner.save();
      res.redirect("/admin/banner");
      message = "Banner added successfully";
    } else {
      res.redirect("/admin/banner");
      msg = "There is already have a banner";
    }
  } catch (error) {
    console.log(error.message);
  }
};

////////////DELETE BANNER/////////////////

const deleteBanner = async (req, res) => {
  try {
    const id = req.query.id;
    await bannerSchema.deleteOne({ _id: id });
    res.redirect("/admin/banner");
    message = "banner delted successfully";
  } catch (error) {
    console.log(error.message);
  }
};

///////////////SHOW PRODUCTS///////////////////

const loadProducts = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 4;
    const products = await productSchema
      .find({
        $or: [
          { title: { $regex: ".*" + search + ".*", $options: "i" } },
          { brand: { $regex: ".*" + search + ".*", $options: "i" } },
        ],
      })
      .populate("category")
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
    const count = await productSchema
      .find({
        $or: [
          { title: { $regex: ".*" + search + ".*", $options: "i" } },
          { brand: { $regex: ".*" + search + ".*", $options: "i" } },
        ],
      })
      .countDocuments();
    res.render("products", {
      product: products,
      message,
      msg,
      totalPages: Math.ceil(count / limit),
    });
    message = "";
    msg = "";
  } catch (error) {
    console.log(error);
  }
};

///////////DELETE PRODUCT//////////////////

const deleteProduct = async (req, res) => {
  try {
    const id = req.body.delete;
    await productSchema.deleteOne({ _id: new Object(id) });
    message = "Product Deleted";
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error);
  }
};

///////////Unlist PRODUCT//////////////////

const unlistProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await productSchema.updateOne(
      { _id: new Object(id) },
      { $set: { unlisted: 1 } }
    );
    message = "Product Unlisted";
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error);
  }
};

///////////List PRODUCT//////////////////

const listProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await productSchema.updateOne(
      { _id: new Object(id) },
      { $set: { unlisted: 0 } }
    );
    message = "Product Listed";
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error);
  }
};
///////////////////LOAD EDIT PRODUCT PAGE//////////////////

const loadEditPage = async (req, res) => {
  try {
    const id = req.query.id;
    const products = await productSchema
      .find({ _id: new Object(id) })
      .populate("category");
    const category = await categorySchema.find();
    res.render("editProduct", { product: products, category: category, msg });
    msg = null;
  } catch (error) {
    console.log(error);
  }
};

///////////////ADD PRODUCT//////////////////
let mess;
const newProduct = async (req, res) => {
  try {
    const category = await categorySchema.find();
    res.render("addProduct", { category: category, message, msg, mess });
    message = null;
    msg = null;
    mess = null;
  } catch (error) {
    console.log(error);
  }
};

///////////ADD PRODUCT///////////

const addProduct = async (req, res) => {
  try {
    const pro = req.body;
    const category = await categorySchema.findOne({
      category: req.body.category,
    });
    if (
      pro.title.trim().length == 0 ||
      pro.brand.trim().length == 0 ||
      pro.description.trim().length == 0 ||
      pro.price.toString().trim().length == 0 ||
      pro.price <= 0 ||
      pro.stock.toString().trim().length == 0 ||
      pro.stock <= 0 ||
      !req.files ||
      req.files.length < 4 ||
      req.files.some((file) => file.mimetype.split("/")[0] !== "image") ||
      pro.size.length == 0 ||
      pro.color.length == 0
    ) {
      message = "Enter Valid Data";
      res.redirect("/admin/addProduct");
    } else {
      let image = req.files.map((file) => file);
      for (i = 0; i < 4; i++) {
        let path = image[i].path;
        const processImage = new Promise((resolve, reject) => {
          sharp(path)
            .rotate()
            .resize(270, 360)
            .toFile("public/proImage/" + image[i].filename, (err) => {
              sharp.cache(false);
              if (err) {
                console.log(err);
                reject(err);
              } else {
                console.log(`Processed file: ${path}`);
                resolve();
              }
            });
        });
        processImage
          .then(() => {
            fs.unlink(path, (err) => {
              if (err) {
                console.log(err);
              } else {
                console.log(`Deleted file: ${path}`);
              }
            });
          })
          .catch((err) => {
            console.log(err);
          });
      }

      const product = new productSchema({
        categoryid: category._id,
        title: pro.title,
        brand: pro.brand,
        stock: pro.stock,
        price: pro.price,
        description: pro.description,
        category: pro.category,
        image: req.files.map((file) => file.filename),
        size: pro.size,
        color: pro.color,
      });
      await product.save();
      mess = "Product Added";
      res.redirect("/admin/addProduct");
    }
  } catch (error) {
    console.log(error);
  }
};

////////EDIT PRODUCTS/////////////

const editProduct = async (req, res) => {
  try {
    const prod = req.body;
    const id = req.query.id;
    const product = await productSchema.findById(id);
    const selectedImagePositions = prod.updateImage; // User-selected image positions
    if (
      prod.title.trim().length == 0 ||
      prod.price.toString().trim().length == 0 ||
      prod.stock.toString().trim().length == 0 ||
      prod.stock <= 0 ||
      prod.category.length == 0 ||
      prod.brand.trim().length == 0 ||
      prod.description.trim().length == 0 ||
      prod.size == undefined ||
      prod.color == undefined
    ) {
      msg = "Fields Should Not Be Empty";
      res.redirect("/admin/products");
    } else {
      let imagePaths = product.image;
      let images = req.files.map((file) => file);
      // Update only the selected images
      if (selectedImagePositions != undefined) {
        imagePaths = await Promise.all(
          imagePaths.map(async (path, i) => {
            if (selectedImagePositions.includes(i.toString())) {
              const image =
                images[selectedImagePositions.indexOf(i.toString())];

              if (image && image.mimetype.split("/")[0] !== "image") {
                msg = "Invalid file type";
                res.redirect("/admin/products");
                return path;
              } else if (image) {
                const newPath = "public/proImage/" + image.filename;
                await sharp(image.path)
                  .rotate()
                  .resize(270, 360)
                  .toFile(newPath);
                try {
                  await fs.promises.unlink(image.path);
                  console.log(`Deleted file: ${image.path}`);
                } catch (error) {}

                // Only update the image path if the user has selected a file
                if (image.size > 0) {
                  return image.filename;
                }
              }
            }
            return path;
          })
        );
      }

      await productSchema.updateOne(
        { _id: id },
        {
          $set: {
            title: prod.title,
            brand: prod.brand,
            description: prod.description,
            category: prod.category,
            stock: prod.stock,
            price: prod.price,
            image: imagePaths,
          },
        }
      );

      message = "Product Updated Successfully";
      res.redirect("/admin/products");
    }
  } catch (error) {
    console.log(error);
  }
};

////////////ADD CATEGORY///////////////

const addCategory = async (req, res) => {
  const newCat = req.body.newcategory;
  const category = categorySchema({
    category: newCat,
  });
  const checkCat = await categorySchema.findOne({ category: newCat });
  if (newCat.trim().length === 0) {
    res.redirect("/admin/category");
    msg = "Please Fill";
  } else {
    if (checkCat) {
      res.redirect("/admin/category");
      msg = "Already Exist";
    } else {
      const cat = await category.save();
      message = "Category Added";
      res.redirect("/admin/category");
    }
  }
};

////////////EDIT CATEGORY///////////

const editCategory = async (req, res) => {
  try {
    let oldCat = req.body.category;
    let newCat = req.body.editedCategory;
    newCat = newCat.toString();
    const checkNew = await categorySchema.findOne({ category: newCat });
    if (newCat.trim().length === 0) {
      res.redirect("/admin/category");
      msg = "Please fill submited area";
    } else {
      if (checkNew) {
        res.redirect("/admin/category");
        msg = "Already Exist";
      } else {
        await categorySchema.findOneAndUpdate(
          { _id: oldCat },
          { $set: { category: newCat } }
        );
        await productSchema.updateMany(
          { categoryid: oldCat },
          { $set: { category: newCat } }
        );
        message = "Category Updated Successfully";
        res.redirect("/admin/Category");
      }
    }
  } catch (error) {
    console.log(error);
  }
};

////////////CATEGORY MANAGE///////////////////

const categoryManage = async (req, res) => {
  try {
    const category = await categorySchema.find();
    res.render("categoryManage", { category: category, msg, message });
    msg = null;
    message = null;
  } catch (error) {
    console.log(error);
  }
};

////////////////////DELETE CATEGORY////////////

const categoryDelete = async (req, res) => {
  try {
    const delCat = req.body.category;
    const category = await categorySchema.findOne({
      category: new Object(delCat),
    });
    const product = await productSchema.findOne({ categoryid: category._id });
    if (product) {
      msg = "Category used in product";
      res.redirect("/admin/Category");
    } else {
      await categorySchema.deleteOne({ category: delCat });
      res.redirect("/admin/Category");
      message = "Category deleted successfully";
    }
  } catch (error) {
    console.log(error);
  }
};

////////////CANCEL ORDER/////////

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.query.orderid;

    await orderSchema.updateOne(
      { _id: orderId },
      { $set: { admin_cancelled: true } }
    );
    const order = await orderSchema.findOne({ _id: orderId });
    if (order.paymentType === "online" || order.paymentType === "wallet") {
      let grandTotal = order.grandTotal;
      const userId = order.userId;
      const user = await userSchema.findOne({ _id: userId });
      const wallet = parseFloat(user.wallet) || 0;
      // Add the totalPrice to the user's wallet
      await userSchema.updateOne(
        { _id: userId },
        { $set: { wallet: wallet + grandTotal } }
      );
    }
    res.redirect("/admin/orders");
    if (order.paymentType === "online") {
      messag = "Orderd canelled And Refunded" || order.paymentType === "wallet";
    } else {
      messag = "Orderd canelled";
    }
  } catch (error) {
    console.log(error.message);
  }
};

////////ORDER Accept///////////

const acceptOrder = async (req, res) => {
  try {
    const orderId = req.query.orderid;
    await orderSchema.updateOne(
      { _id: orderId },
      { $set: { is_confirmed: true } }
    );
    const order = await orderSchema.findOne({ _id: orderId });
    ///stock decrementing///
    for (const item of order.item) {
      const productId = item.product._id;
      const qty = item.quantity;
      const product = await productSchema.findOne({ _id: productId });

      product.stock -= qty;
      await product.save();
    }

    res.redirect("/admin/orders");
    message = "Order confirmed";
  } catch (error) {
    console.log(error.message);
  }
};

///Confirm Delivery/////

const PDFDocument = require("pdfkit");
const { count } = require("console");

const acceptDelivery = async (req, res) => {
  try {
    const orderId = req.query.orderid;
    const order = await orderSchema.findOne({ _id: orderId });
    if (order.is_delivered === false) {
      await orderSchema.updateOne(
        { _id: orderId },
        {
          $set: {
            is_delivered: true,
            delivered_date: new Date(),
          },
        }
      );

      // Generate the invoice PDF
      const doc = new PDFDocument();
      ///content
      doc.text("Invoice", { align: "center", fontSize: 20 });
      doc.text("Order ID: " + order.orderId);
      doc.text("Delivered Date: " + new Date().toLocaleDateString());
      doc.text("Order Amount: " + order.grandTotal);
      doc.text("Name: " + order.address[0].username);
      doc.text("Order Address: " + order.address[0].address);
      doc.text("Order Phone: " + order.address[0].phone);
      doc.text("Order Phone: " + order.paymentType);

      const invoiceBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.end();
      });

      // Send Delivery email with invoice attachment
      const userId = order.userId;
      const user = await userSchema.findOne({ _id: userId });
      const email = user.email;
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
        subject: "Order Status",
        html: `<h6>Hii ${user.username},</h6>  <p> Your Order is Delivered Succesfully.</p>`,
        attachments: [
          {
            filename: "invoice.pdf",
            content: invoiceBuffer,
            contentType: "application/pdf",
          },
        ],
      };

      transporter.sendMail(mailOption, (error, info) => {
        if (error) {
          console.log(error.message);
          console.log("Email could not be sent");
        } else {
          console.log("Email has been sent:", info.response);
        }
      });

      const updatedOrder = await orderSchema.findOne({ _id: orderId });
      if (
        updatedOrder.is_delivered === true &&
        (updatedOrder.admin_reject === 1 || updatedOrder.admin_reject === 0)
      ) {
        // Create Sales Report
        let product = [];
        let totalprice = 0;
        updatedOrder.item.forEach((item) => {
          product.push(item.product);
          totalprice += item.price * item.quantity;
        });
        const newSalesReport = new salesSchema({
          date: new Date(),
          orders: updatedOrder._id,
          products: product,
          totalSales: totalprice,
          totalItemsSold: product.length,
          userId: updatedOrder.userId,
          location: updatedOrder.address[0].city,
          orderId: updatedOrder.orderId,
        });
        await newSalesReport.save();
      }
      res.redirect("/admin/home");
      message = "Order status changed successfully";
    }
  } catch (error) {
    console.log(error.message);
  }
};

///Invoice page////
const invoice = async (req, res) => {
  try {
    res.render("/admin/invoice");
  } catch (error) {
    console.log(error.message);
  }
};

////Return rejected////

const rejectReturn = async (req, res) => {
  try {
    const orderId = req.query.orderid;
    await orderSchema.updateOne(
      { _id: orderId },
      { $set: { admin_reject: 1 } }
    );
    res.redirect("/admin/orders");
    messag = "Return Rejected";
  } catch (error) {
    console.log(error.message);
  }
};

//////Accepting Return/////

const acceptReturn = async (req, res) => {
  try {
    const orderId = req.query.orderid;
    const order = await orderSchema.findOne({ _id: orderId });
    ///updating stock/////
    for (let item of order.item) {
      const product = await productSchema.findOne({ _id: item.product });
      const newStockQuantity = product.stock + item.quantity;
      await productSchema.updateOne(
        { _id: item.product },
        { $set: { stock: newStockQuantity } }
      );
    }
    await orderSchema.updateOne(
      { _id: orderId },
      { $set: { admin_reject: 2 } }
    );
    //delete from sales report
    await salesSchema.deleteOne({
      orders: orderId,
    });
    let grandTotal = order.grandTotal;
    const userId = order.userId;
    const userr = new userSchema({});
    const user = await userSchema.findOne({ _id: userId });
    const wallet = parseFloat(user.wallet) || 0;
    // Add the totalPrice to the user's wallet
    await userSchema.updateOne(
      { _id: userId },
      { $set: { wallet: wallet + grandTotal } }
    );
    res.redirect("/admin/orders");
    message = "Return accepted";
  } catch (error) {
    console.log(error.message);
  }
};

/////view order////

const viewOrder = async (req, res) => {
  try {
    const orderId = req.query.orderid;
    const orders = await orderSchema
      .findOne({ _id: orderId })
      .populate("item.product");

    res.render("viewOrder", { orders });
  } catch (error) {
    console.log(error.message);
  }
};

//////Coupon////////

const CouponGenerate = async (req, res) => {
  try {
    const coupon = await couponSchema.find();
    if (coupon) {
      res.render("coupon", { message, coupon, msg });
      message = null;
      msg=null;
      messag=null;
    } else {
      res.render("coupon", { message, msg });
      message = null;
      msg = null;
      messag=null;
    }
  } catch (error) {
    console.log(error);
  }
};

const addCoupon = async (req, res) => {
  try {
    let couponData = req.body;
    const coupon = couponSchema({
      couponId: couponData.couponId,
      expiryDate: couponData.expiryDate,
      minItems: parseInt(couponData.items),
      minAmount: parseInt(couponData.minAmount),
      maxAmt: parseInt(couponData.maxAmount),
      discount: parseInt(couponData.discount),
    });
    const check = await couponSchema.findOne({ couponId: couponData.couponId });
    if (
      couponData.couponId.trim().length === 0 ||
      couponData.expiryDate.toString().trim().length === 0 ||
      couponData.items.toString().trim().length === 0 ||
      couponData.minAmount.toString().trim().length === 0 ||
      couponData.maxAmount.toString().trim().length === 0 ||
      couponData.discount.toString().trim() === 0
    ) {
      message = "please fill all fields";
      res.redirect("/admin/Coupons");
    } else {
      if (check) {
        message = "Coupon Already Exist";
        res.redirect("/admin/Coupons");
      } else {
        const coup = await coupon.save();
        msg = "coupon added";
        res.redirect("/admin/Coupons");
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    let couponId = req.query.id;
    await couponSchema.deleteOne({ _id: couponId });
    message = "Coupon Deleted";
    res.redirect("/admin/Coupons");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loginLoad,
  adminLogin,
  loadAdminHome,
  adminLogOut,
  loadUserData,
  blockUser,
  unblockUser,
  newProduct,
  addCategory,
  addProduct,
  loadProducts,
  deleteProduct,
  loadEditPage,
  editProduct,
  categoryManage,
  editCategory,
  categoryDelete,
  orders,
  cancelOrder,
  acceptOrder,
  acceptDelivery,
  rejectReturn,
  acceptReturn,
  CouponGenerate,
  addCoupon,
  deleteCoupon,
  loadSalesPage,
  unlistProduct,
  listProduct,
  viewOrder,
  bannersPage,
  loadAddBanner,
  addBanner,
  deleteBanner,
};
