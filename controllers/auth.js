const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
require('dotenv').config();

const User = require("../models/user");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  })
);

exports.getLogin = (req, res, next) => {
  console.log("login", req.flash("error")[0]);
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error")[0],
  });
};

exports.getSignup = (req, res, next) => {
  console.log("signup", req.flash("error")[0]);
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: req.flash("error")[0],
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (!doMatch) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/login");
          }
          req.session.isLoggedIn = true;
          req.session.user = user;
          req.session.save((err) => {
            console.log(err);
            return res.redirect("/");
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash("error", "Email already exists");
        return res.redirect("/signup");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/login");
          transporter
            .sendMail({
              to: email,
              from: "aman.kumar466@gmail.com",
              subject: "Signup succeeded!",
              html: "<h1>You successfully signed up!</h1>",
            })
            .catch((err) => {
              console.log("mail err", err);
            });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error")[0];
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        return transporter.sendMail({
          to: req.body.email,
          from: "aman.kumar466@gmail.com",
          subject: "Password Reset",
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `,
        });
      })
      .then(() => {
        // Ensure response is sent only once
        if (!res.headersSent) {
          res.redirect("/");
        }
      })
      .catch((err) => {
        console.log(err);
        if (!res.headersSent) {
          res.redirect("/reset");
        }
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  console.log('token', token);
  User.findOne({
    resetToken: token,
    resetTokenExpiration: {
      $gt: Date.now(),
    },
  })
  .then((user) => {
    console.log('userrrr', user);
    let message = req.flash("error")[0];
    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token,
    });
  })
  .catch((err) => console.log(err));
};


exports.postNewPassword = (req, res, next) => {
  const { password: newPassword, userId, passwordToken } = req.body;
  let resetUser;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {
      $gt: Date.now(),
    },
    _id: userId,
  })
  .then((user) => {
    resetUser = user;
    bcrypt
      .hash(newPassword, 12)
      .then((hashedPassword) => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
      })
      .then((result) => {
        res.redirect("/login");
      })
      .catch((err) => console.log(err));
  })
  .catch((err) => console.log(err));
}