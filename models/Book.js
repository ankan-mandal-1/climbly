const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    bookName: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true,
    },
    id: [{
        link: String,
    }],
});

const book = mongoose.model('Book', bookSchema)

module.exports = book;