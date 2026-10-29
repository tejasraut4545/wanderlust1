require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");

const passport = require("passport");

const User = require("./models/user.js");
const userRouter = require("./routes/user.js");

const app = express();

// ================= ENVIRONMENT VARIABLES =================

const dbUrl = process.env.ATLASDB_URL;
const sessionSecret = process.env.SECRET;

const PORT = process.env.PORT || 8080;

// Validate configuration before starting the server.
if (!dbUrl) {
    throw new Error(
        "ATLASDB_URL is missing. Set it in Render Environment settings."
    );
}

if (!sessionSecret) {
    throw new Error(
        "SECRET is missing. Set it in Render Environment settings."
    );
}

console.log("MongoDB URL loaded:", Boolean(dbUrl));
console.log("Session secret loaded:", Boolean(sessionSecret));

// ================= APP CONFIGURATION =================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ================= SESSION =================

const store = MongoStore.create({
    mongoUrl: dbUrl,
    collectionName: "sessions",
    touchAfter: 24 * 3600
});

store.on("error", (err) => {
    console.error("MongoDB SESSION STORE ERROR:", err.message);
});

const sessionOptions = {
    store: store,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
};

app.use(session(sessionOptions));

// ================= FLASH =================

app.use(flash());

// ================= PASSPORT =================

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ================= GLOBAL VARIABLES =================

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});

// ================= USER ROUTER =================

app.use("/", userRouter);

// ================= AUTHENTICATION MIDDLEWARE =================

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to continue.");
        return res.redirect("/login");
    }

    next();
};

// ================= ROOT ROUTE =================

app.get("/", (req, res) => {
    res.redirect("/listings");
});

// ================= LISTINGS INDEX =================

app.get("/listings", async (req, res, next) => {
    try {
        const allListings = await Listing.find({});
        res.render("listings/index.ejs", { allListings });
    } catch (err) {
        next(err);
    }
});

// ================= NEW LISTING =================

app.get("/listings/new", isLoggedIn, (req, res, next) => {
    res.render("listings/new.ejs");
});

// ================= CREATE LISTING =================

app.post("/listings", isLoggedIn, async (req, res, next) => {
    try {
        const newListing = new Listing(req.body.listing);
        await newListing.save();

        req.flash("success", "New listing created successfully!");
        res.redirect("/listings");
    } catch (err) {
        next(err);
    }
});

// ================= EDIT LISTING =================

app.get("/listings/:id/edit", isLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        res.render("listings/edit.ejs", { listing });
    } catch (err) {
        next(err);
    }
});

// ================= SHOW LISTING =================

app.get("/listings/:id", async (req, res, next) => {
    try {
        const { id } = req.params;

        const listing = await Listing.findById(id)
            .populate("reviews");

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        res.render("listings/show.ejs", { listing });
    } catch (err) {
        next(err);
    }
});

// ================= UPDATE LISTING =================

app.put("/listings/:id", isLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params;

        await Listing.findByIdAndUpdate(
            id,
            { ...req.body.listing },
            { runValidators: true }
        );

        req.flash("success", "Listing updated successfully!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        next(err);
    }
});

// ================= DELETE LISTING =================

app.delete("/listings/:id", isLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params;

        await Listing.findByIdAndDelete(id);

        req.flash("success", "Listing deleted successfully!");
        res.redirect("/listings");
    } catch (err) {
        next(err);
    }
});

// ================= REVIEWS =================

app.post("/listings/:id/reviews", isLoggedIn, async (req, res, next) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        const newReview = new Review(req.body.review);

        await newReview.save();

        listing.reviews.push(newReview._id);
        await listing.save();

        req.flash("success", "Review added successfully!");
        res.redirect(`/listings/${listing._id}`);
    } catch (err) {
        next(err);
    }
});

// ================= ERROR HANDLING =================

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).send("Something went wrong.");
});

// ================= DATABASE & SERVER =================

async function startServer() {
    try {
        await mongoose.connect(dbUrl);

        console.log("Connected to MongoDB successfully.");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start application:", err.message);
        process.exit(1);
    }
}

startServer();
