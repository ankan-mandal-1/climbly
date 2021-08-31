const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: 'private'
    },
    icon: {
        type: String,
        required: true,
    }
});

const note = mongoose.model('Note', noteSchema)

module.exports = note;