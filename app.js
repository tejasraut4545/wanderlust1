require("dotenv").config();

const express = require("express");
const app = express();

const mongoose = require("mongoose");

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");

const passport = require("passport");

const User = require("./models/user.js");
const userRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

console.log("DB URL loaded:", dbUrl ? "YES" : "NO");


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
    crypto: {
        secret: "A1b2C3d4E5f6G7h8I9j0!@#$%^&*()_+~`|}{[]:;?><,./-=thisISanULTRAcomplexANDsuperLONGsecretKEYforWANDERLUSTapp2026!!!",
    },
    touchAfter: 24 * 3600,
});
store.on("error",()=>{
    console.log("ERROR IN MONGO SESSION STORE",err);
});
const sessionOptions = {
    store,
    secret:"A1b2C3d4E5f6G7h8I9j0!@#$%^&*()_+~`|}{[]:;?><,./-=thisISanULTRAcomplexANDsuperLONGsecretKEYforWANDERLUSTapp2026!!!",

    resave: false,

    saveUninitialized: false,

    cookie: {
        expires: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        ),

        maxAge: 7 * 24 * 60 * 60 * 1000,

        httpOnly: true
    }
};
app.use(session(sessionOptions));


// ================= FLASH =================

app.use(flash());


// ================= PASSPORT =================

app.use(passport.initialize());

app.use(passport.session());


// IMPORTANT:
// passport-local-mongoose creates the LocalStrategy

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

        req.flash(
            "error",
            "You must be logged in to continue."
        );

        return res.redirect("/login");
    }

    next();
};


// ================= ROOT ROUTE =================

//app.get("/", (req, res) => {

   // res.send("Hi, I am root");

//});
//

// ================= LISTINGS =================


// INDEX ROUTE

app.get("/listings", async (req, res, next) => {

    try {

        const allListings = await Listing.find({});

        res.render(
            "listings/index.ejs",
            {
                allListings
            }
        );

    } catch (err) {

        next(err);

    }

});


// ================= NEW LISTING =================

app.get(
    "/listings/new",
    isLoggedIn,
    (req, res) => {

        res.render("listings/new.ejs");

    }
);


// ================= CREATE LISTING =================

app.post(
    "/listings",
    isLoggedIn,
    async (req, res, next) => {

        try {

            const newListing = new Listing(
                req.body.listing
            );

            await newListing.save();

            req.flash(
                "success",
                "New listing created successfully!"
            );

            res.redirect("/listings");

        } catch (err) {

            next(err);

        }

    }
);


// ================= EDIT LISTING =================

app.get(
    "/listings/:id/edit",
    isLoggedIn,
    async (req, res, next) => {

        try {

            const { id } = req.params;

            const listing =
                await Listing.findById(id);

            if (!listing) {

                req.flash(
                    "error",
                    "Listing not found."
                );

                return res.redirect("/listings");
            }

            res.render(
                "listings/edit.ejs",
                {
                    listing
                }
            );

        } catch (err) {

            next(err);

        }

    }
);


// ================= SHOW LISTING =================

app.get(
    "/listings/:id",
    async (req, res, next) => {

        try {

            const { id } = req.params;

            const listing =
                await Listing.findById(id)
                .populate("reviews");

            if (!listing) {

                req.flash(
                    "error",
                    "Listing not found."
                );

                return res.redirect("/listings");
            }

            res.render(
                "listings/show.ejs",
                {
                    listing
                }
            );

        } catch (err) {

            next(err);

        }

    }
);


// ================= UPDATE LISTING =================

app.put(
    "/listings/:id",
    isLoggedIn,
    async (req, res, next) => {

        try {

            const { id } = req.params;

            await Listing.findByIdAndUpdate(
                id,
                {
                    ...req.body.listing
                }
            );

            req.flash(
                "success",
                "Listing updated successfully!"
            );

            res.redirect(
                `/listings/${id}`
            );

        } catch (err) {

            next(err);

        }

    }
);


// ================= DELETE LISTING =================

app.delete(
    "/listings/:id",
    isLoggedIn,
    async (req, res, next) => {

        try {

            const { id } = req.params;

            await Listing.findByIdAndDelete(id);

            req.flash(
                "success",
                "Listing deleted successfully!"
            );

            res.redirect("/listings");

        } catch (err) {

            next(err);

        }

    }
);


// ================= REVIEW =================

app.post(
    "/listings/:id/reviews",
    isLoggedIn,
    async (req, res, next) => {

        try {

            const listing =
                await Listing.findById(
                    req.params.id
                );

            if (!listing) {

                req.flash(
                    "error",
                    "Listing not found."
                );

                return res.redirect("/listings");
            }

            const newReview =
                new Review(req.body.review);

            if (!listing.reviews) {

                listing.reviews = [];

            }

            listing.reviews.push(newReview);

            await newReview.save();

            await listing.save();

            req.flash(
                "success",
                "Review added successfully!"
            );

            res.redirect(
                `/listings/${listing._id}`
            );

        } catch (err) {

            console.log(
                "REVIEW ERROR:",
                err
            );

            next(err);

        }

    }
);

// ================= DATABASE CONNECTION & SERVER START =================

const PORT = process.env.PORT || 8080;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("Connected to DB SUCCESSFULLY");
        app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("Database connection error:", err);
    });




// ================= ERROR HANDLING =================

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);
    res.status(500).send("Something went wrong");
});

// ================= DATABASE CONNECTION & SERVER START ===============

const PORT = process.env.PORT || 8080;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("Connected to DB SUCCESSFULLY");
        app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("Database connection error:", err);
    });


