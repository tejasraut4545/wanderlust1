const express = require("express");
const router = express.Router();

const passport = require("passport");
const User = require("../models/user.js");


// ================= SIGNUP GET =================

router.get("/signup", (req, res) => {

    res.render("users/signup.ejs");

});


// ================= SIGNUP POST =================

router.post("/signup", async (req, res, next) => {

    try {

        const { username, email, password } = req.body;

        const newUser = new User({
            username: username,
            email: email
        });

        await User.register(newUser, password);

        req.flash(
            "success",
            "Account created successfully! Please login."
        );

        res.redirect("/login");

    } catch (err) {

        console.log("SIGNUP ERROR:", err);

        req.flash(
            "error",
            err.message
        );

        res.redirect("/signup");

    }

});


// ================= LOGIN GET =================

router.get("/login", (req, res) => {

    res.render("users/login.ejs");

});


// ================= LOGIN POST =================

router.post(
    "/login",

    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true
    }),

    (req, res) => {

        console.log("LOGIN SUCCESS");
        console.log("Logged in user:", req.user);

        req.flash(
            "success",
            "Welcome back to Wanderlust!"
        );

        res.redirect("/listings");

    }
);


// ================= LOGOUT =================

router.get("/logout", (req, res, next) => {

    req.logout((err) => {

        if (err) {
            return next(err);
        }

        req.flash(
            "success",
            "You have been logged out successfully!"
        );

        res.redirect("/listings");

    });

});


module.exports = router;