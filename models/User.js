const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 2,
        max: 240
    },
    imageUrl: {
        type: String,
        default: 'https://amw.netlify.app/no_profile.svg'
    },
    email: {
        type: String,
        required: true,
        min: 2,
        max: 340
    },
    password: {
        type: String,
        required: true,
        min: 6,
        max: 240
    },
    uuid: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        min:0,
        max: 120,
    },
    facebook: {
        type: String,
        min:0,
        max: 200,
    },
    instagram: {
        type: String,
        min:0,
        max: 200,
    },
    youtube: {
        type: String,
        min:0,
        max: 200,
    },
    public: {
        type: String,
        required: true,
    },
    verified: {
        type: String,
    }
});

module.exports = mongoose.model('User', userSchema)
