require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const verify = require('./verify')
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, Result } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path')
const cloudinary = require("cloudinary");

cloudinary.config({
    cloud_name: 'dfflk6oiq',
    api_key: '924287212334238',
    api_secret: 'I4JTW32UZGDX8o-JdRkp3yDmzeU'
});

//Multer Connection-------------------------------------------------------------
var storage = multer.diskStorage({
    destination: function(req, file, cb){
      cb(null, 'public/uploads')
    },
    filename: function(req, file, cb){
      cb(null, Date.now() + path.extname(file.originalname));
    }
  })
  
  var upload = multer({
    storage: storage
  })
  //Multer Connection END---------------------------------------------------------

const hour = 3600000;

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ limit: "2mb", extended: true, parameterLimit: 50000 })); 
app.use(express.json())
app.use(cookieParser())
app.use(express.static(__dirname + "/public"));

mongoose.connect(process.env.DB, { useNewUrlParser: true,  useUnifiedTopology: true, useFindAndModify: false  })

const User = require('./models/User')
const Note = require('./models/Note');

app.get('/', (req, res) => {

        const token = req.cookies.user_id;
        const id = req.cookies.last_page; 

        if (!token){
            res.render('Home', {errorLog: "", errorReg: ""})
        } else {
            try {
                const verified = jwt.verify(token, process.env.JWT);
                // if(id){
                //     res.redirect('/dashboard/' + id)
                // } else {
                    res.redirect('/dashboard')
                // }
            } catch (err) {
                res.render('Home', {errorLog: "", errorReg: ""})
            }
        }
})

app.get('/register', (req, res) => {
    res.render('Register', {errorReg: ""})
})

app.post('/register', body('email').isEmail().trim().escape().normalizeEmail(), body('password').isLength({ min: 6 }), async (req, res) => {
       
    const reqName = req.body.name;
    const reqEmail = req.body.email
    const reqPassword = req.body.password

    const name = reqName.trim()
    const email = reqEmail.trim()
    const password = reqPassword.trim()

    const uuid = uuidv4();

    const unique = uuid;

    const removeEmoji = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    const splitName = removeEmoji.replace(/\s+/g, '-').toLowerCase()
    const splitUuid = unique.split('-')

    const publicUrl = splitName + "-" + splitUuid[0];

    if(!name && !email && !password){
        res.redirect('/')
    } else {

    User.findOne({email}, async (err, result) => {
        if(err){
            res.redirect('/')
        } else {
            if(result){
                // console.log("Email already register")
                res.render('Register', {errorLog: "", errorReg: "Email already registered"})
            } else {
                bcrypt.hash(password, 10, function(err, hash) {
                    if(err) {
                        res.redirect('/')
                    } else {
                    const userDetail = new User({
                        name: name,
                        email: email,
                        password: hash,
                        uuid,
                        public: publicUrl,
                        verified: "false",
                    }).save((err, result) => {
                        if(!err){

                            const token = jwt.sign(
                                { user_id: result.uuid }, process.env.JWT, {expiresIn: "180d",}
                              );
    
                            res.cookie("user_id", token, { maxAge: 180 * 24 * hour, httpOnly: true});
                            res.cookie('user_name', result.name, { maxAge: 180 * 24 * hour, httpOnly: true})
                            res.cookie('user_public', result.public, { maxAge: 180 * 24 * hour, httpOnly: true})
                            res.cookie('user_image', result.imageUrl, { maxAge: 180 * 24 * hour, httpOnly: true})
                            res.redirect('/dashboard')
                        } else {
                            res.redirect('/')
                        }
                    })
                    }
                });
            }
        }
    })
}

})

app.get('/login', (req, res) => {
    res.render('Login', {errorLog: ""})
})

app.post('/login', async (req, res) => {
    
    const reqEmail = req.body.email
    const reqPassword = req.body.password

    const email = reqEmail.trim();
    const password = reqPassword.trim();

    if(!email && !password){
        console.log("Empty Field");
        res.redirect('/')
    } else {

    User.findOne({email}, async (err, foundItem) => {
        if(err){
            res.redirect('/')
        } else {
            if(foundItem) {

                const hash = foundItem.password;

                bcrypt.compare(password, hash, async function(err, result) {
                    if(result === true){
                    
                        const token = jwt.sign(
                            { user_id: foundItem.uuid }, process.env.JWT, {expiresIn: "180d",}
                          );

                          res.cookie("user_id", token, { maxAge: 180 * 24 * hour, httpOnly: true}); //6 months
                          res.cookie('user_name', foundItem.name, { maxAge: 180 * 24 * hour, httpOnly: true})
                          res.cookie('user_public', foundItem.public, { maxAge: 180 * 24 * hour, httpOnly: true})
                          res.cookie('user_image', foundItem.imageUrl, { maxAge: 180 * 24 * hour, httpOnly: true})
                          res.redirect('/dashboard')
                          
                    } else {
                        // res.redirect('/')
                        res.render('Login', {errorLog: "Invalid Email or Password", errorReg: ""})
                    }
                });
                
            } else {
                res.render('Login', {errorLog: "Invalid Email or Password", errorReg: ""})
            }
        }
    })
}
})

app.get('/privacy-policy', (req, res) => {
    res.render('Privacy')
})

app.get('/terms-and-conditions', (req, res) => {
    res.render('Terms')
})

app.get('/about-us', (req, res) => {
    res.render('About')
})

app.get('/sitemap', (req, res) => {
    User.find({}, null, { sort: { _id: -1 } }, (err, result) => {
        if(err){
            console.log(err);
        } else {
            res.setHeader('content-type', 'text/xml')
            res.render("sitemap", {result: result})
        }
    })
})

app.get('/p/:user', (req, res) => {
    /* https://www.climbly.in/p/ankan-mandal-365ea9dc */
    const public = req.params.user;

    User.findOne({public}, (err, result) => {
        if(err){
            res.render('404')
        } else {
            res.render('Publicprofile', {result})
        }
    })

})

app.get('/dashboard', verify, async (req, res) => {

    const token = req.cookies.user_id;
    const name = req.cookies.user_name;
    const uuid = jwt.verify(token, process.env.JWT);
    
    await Note.find({author: uuid.user_id, status: "private"}, null, { sort: { _id: -1 } }, (err, result) => {
        if(err) {
            res.redirect('/dashboard')
        } else {
            res.render('Dashboard', {result: result, name: name})
        }
    })

    
})

app.get('/dashboard/profile', verify, (req, res) => {

    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    User.findOne({uuid: uuid.user_id}, (err, result) => {
        if(err){
            res.redirect('/dashboard')
        } else {
            res.render('Profile', {
                name: result.name,
                image: result.imageUrl,
                bio: result.bio,
                facebook: result.facebook,
                instagram: result.instagram,
                youtube: result.youtube,
                public: result.public
            })
        }
    })
})

app.get('/dashboard/profile/edit', verify, (req, res) => {
    
    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    User.findOne({uuid: uuid.user_id}, (err, result) => {
        if(err){
            res.redirect('/dashboard')
        } else {
            res.render('Profileadd', {result: result})
        }
    })
})

app.post('/dashboard/profile/edit', verify, upload.single('image'), async (req, res) => {

    const { name, bio, facebook, instagram, youtube } = req.body;

    const newName = name.trim().toLowerCase();
    const newBio = bio.trim();
    const newFacebook = facebook.trim().toLowerCase();
    const newInstagram = instagram.trim().toLowerCase();
    const newYoutube = youtube.trim().toLowerCase();

    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    const unique = uuid.user_id;

    const removeEmoji = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    const splitName = removeEmoji.replace(/\s+/g, '-').toLowerCase()
    const splitUuid = unique.split('-')

    const publicUrl = splitName + "-" + splitUuid[0];
    

    if(req.file){
       
        const dateTo = Date.now();

        await sharp(req.file.path).resize(200).toFile("./public/uploads/compress/"+ dateTo +".jpg").then(response => {
          console.log(response);
        }).catch(err => console.log("200: " + err))

        await cloudinary.v2.uploader.upload("./public/uploads/compress/" + dateTo + '.jpg', function(error, result) {
            User.findOneAndUpdate({uuid: uuid.user_id}, {name: newName, imageUrl: result.secure_url, bio: newBio, facebook: newFacebook, instagram: newInstagram, youtube: newYoutube, public: publicUrl}, {new: true}, (err, result) => {
                if(err){
                    console.log(err);
                    res.redirect('/dashboard/profile')
                } else {
                    res.redirect('/dashboard/profile')
                }
            })
        });
    
    } else{
        User.findOneAndUpdate({uuid: uuid.user_id}, {name: newName, bio: newBio, facebook: newFacebook, instagram: newInstagram, youtube: newYoutube, public: publicUrl}, {new: true}, (err, result) => {
            if(err){
                res.redirect('/dashboard/profile')
            } else {
            
                res.cookie('user_name', result.name, { maxAge: 180 * 24 * hour, httpOnly: true})
                res.cookie('user_bio', result.bio, { maxAge: 180 * 24 * hour, httpOnly: true})
                res.cookie('user_facebook', result.facebook, { maxAge: 180 * 24 * hour, httpOnly: true})
                res.cookie('user_instagram', result.instagram, { maxAge: 180 * 24 * hour, httpOnly: true})
                res.cookie('user_youtube', result.youtube, { maxAge: 180 * 24 * hour, httpOnly: true})
                res.cookie('user_public', result.public, { maxAge: 180 * 24 * hour, httpOnly: true})
                res.redirect('/dashboard/profile')
            }
        })
    }

    
    
})

app.get('/dashboard/new', verify, async (req, res) => {

    const token = req.cookies.user_id;
    const name = req.cookies.user_name;
    const uuid = await jwt.verify(token, process.env.JWT);
    const icon = Math.floor(Math.random() * 58);
    
    Note.find({author: uuid.user_id, status: "private"}, (err, result) => {
        if(err) {
            res.redirect('/')
        } else {
            res.render('Addnew', {result: result, name: name, icon: icon})
        }
    })

})

app.get('/dashboard/mobile-new', verify, async (req, res) => {
    const icon = Math.floor(Math.random() * 52);
    
    res.render('Mobileadd', {icon: icon})

})

app.post('/dashboard/addnew', verify, async (req, res) => {
   
    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    const device = req.body.device;

    const reqTitle = req.body.title;

    const title = reqTitle.trim();
    const body = sanitizeHtml(req.body.body)

    const icon = req.body.icon;

    const saved = new Note({
        title,
        body,
        author: uuid.user_id,
        icon
    })

    const saveItem = await saved.save()

    if(device === "mobile"){
        res.redirect('/dashboard')
    } else {
        res.redirect('/dashboard/' + saveItem._id)
    }
    
    // console.log(saveItem._id.getTimestamp())
    // console.log(saveItem)

})

app.post('/dashboard/delete/:id', verify, (req, res) => {

    const id = req.params.id
    const authorId = req.body.author;
    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    if(authorId === uuid.user_id){

        Note.findByIdAndUpdate(id, {status: 'trash'}, (err, result) => {
            if(err){
                res.redirect('/dashboard')
            } else {
                res.redirect('/dashboard')
            }
        })

    } else {
        res.redirect('/login')
    }

})

app.get('/dashboard/recycle', verify, (req, res) => {

    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    Note.find({author: uuid.user_id, status: "private"}, null, { sort: { _id: -1 } }, (err, result) => {
        if(err){
            res.redirect('/dashboard')
        } else {
            Note.find({author: uuid.user_id, status: "trash"}, null, { sort: { _id: -1 } }, (err, single) => {
                if(err){
                    res.redirect('/dashboard')
                } else {
                    res.render('Recycle', {result: result, single: single})
                }
            })
        }
    })
})

app.get('/dashboard/recycle/restore/:id/:author', verify, (req, res) => {
    const id = req.params.id;
    const authorId = req.params.author;

    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    if(uuid.user_id === authorId){
        Note.findByIdAndUpdate(id, {status: 'private'}, (err, result) => {
            if(err){
                res.redirect('/dashboard')
            } else {
                res.redirect('/dashboard')
            }
        })
    } else {
        res.redirect('/login')
    }
 
})

app.get('/dashboard/recycle/delete/:id/:author', verify, (req, res) => {
    const id = req.params.id;
    const authorId = req.params.author;

    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    //Later implement app.post('/dashboard/:id', verify, async (req, res) => { verification method


    if(uuid.user_id === authorId){
        Note.findByIdAndDelete(id, (err) => {
            if(err){
                res.redirect('/dashboard/recycle')
            } else {
                res.redirect('/dashboard/recycle')
            }
        })
    } else {
        res.redirect('/login')
    }
    
})

app.get('/dashboard/m/:id', verify, async (req, res) => {

    const id = req.params.id;

    const token = req.cookies.user_id;
    const uuid = await jwt.verify(token, process.env.JWT);

    Note.findById(id, (err, single) => {
        if(err){
            res.send('No Page Found!')
        } else {
            if(uuid.user_id === single.author){
                res.cookie('last_page', single._id, { maxAge: 7 * 24 * hour, httpOnly: true})
                res.render('Mobilenote', {single: single})
            } else {
                res.redirect('/login')
            }
        }
    })
})

app.get('/dashboard/:id', verify, async (req, res) => {

    const id = req.params.id;

    const token = req.cookies.user_id;
    const uuid = await jwt.verify(token, process.env.JWT);

    Note.find({author: uuid.user_id, status: "private"}, null, { sort: { _id: -1 } }, (err, result) => {
        if(err){
            res.redirect('/dashboard')
        } else {
            Note.findById(id, (err, single) => {
                if(err){
                    res.send('No Page Found!')
                } else {
                    if(uuid.user_id === single.author){
                        res.cookie('last_page', single._id, { maxAge: 7 * 24 * hour, httpOnly: true})
                        res.render('Note', {result: result, single: single})
                    } else {
                        res.redirect('/login')
                    }
                }
            })
            
        }
    })

})

app.post('/dashboard/:id', verify, async (req, res) => {
    
    const reqTitle = req.body.title;
    const device = req.body.device;
    const title = reqTitle.trim();
    const body = sanitizeHtml(req.body.body)
    
    const id = req.params.id
    const token = req.cookies.user_id;
    const uuid = jwt.verify(token, process.env.JWT);

    Note.findById(id, (err, result) => {
        if(err){
            res.redirect('/dashboard')
        } else {
            if(uuid.user_id === result.author){
                Note.findByIdAndUpdate(id, {title: title, body: body}, (err, result) => {
                    if(err){
                        res.redirect('/dashboard')
                    } else {
                        if(device === "mobile"){
                            res.redirect('/dashboard')
                        } else {
                            res.redirect('/dashboard/' + id)
                        }
                    }
                })
            } else {
                res.redirect('/login')
            }
        }
    })
    
})

app.get('/logout', verify, (req, res) => {
    res.clearCookie('user_id')
    res.clearCookie('user_name')
    res.clearCookie('last_note')
    res.clearCookie('user_bio')
    res.clearCookie('user_facebook')
    res.clearCookie('user_instagram')
    res.clearCookie('user_youtube')
    res.clearCookie('user_image')
    res.redirect('/')
})

app.get('*', (req, res) => {
    res.render('404')
})

app.listen(process.env.PORT, () => {
    console.log("Server has started in PORT 3000!")
})
