require('dotenv').config()
const jwt = require('jsonwebtoken');

function verify(req, res, next) {
    
    const token = req.cookies.user_id;
    if (!token) return res.redirect('/')

    try {
        const verified = jwt.verify(token, process.env.JWT);
        req.user = verified;
        next()
    } catch (err) {
        res.redirect('/')
    }
};

module.exports = verify;


