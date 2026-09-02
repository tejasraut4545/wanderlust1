const mongoose = require("mongoose");
const passportLocalMongoosePackage = require("passport-local-mongoose");

const passportLocalMongoose =
    passportLocalMongoosePackage.default ||
    passportLocalMongoosePackage;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    }
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);