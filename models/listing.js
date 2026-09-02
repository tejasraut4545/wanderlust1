const mongoose = require("mongoose");
const Review = require("./review.js");

const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    description: String,

    image: {
        filename: String,
        url: String
    },

    price: Number,

    location: String,

    country: String,

    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ]
});


// 👇 ADD MIDDLEWARE HERE

listingSchema.post("findOneAndDelete", async function (listing) {
    if (listing) {
        await Review.deleteMany({
            _id: { $in: listing.reviews }
        });
    }
});


// 👇 MODEL AFTER MIDDLEWARE

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;