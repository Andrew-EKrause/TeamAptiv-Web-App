/**
 * DESCRIPTION...
 * 
 * Project: Aptiv Web Application
 * Author: Andrew Krause
 * Date: TBD
 */

//jshint esversion:6

/* SECTION: INSTALLED PACKAGES AND INITIALIZATION */

// Security package. Encrypts sensitive data. No variable storage needed.
require('dotenv').config();

// Require packages for the server that were installed.
const express = require("express");
const flash = require('connect-flash'); // --> MAY NOT NEED THIS
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
var user_ID = mongoose.Types.ObjectId();

// Require additional security packages for login information
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// Create web app using express and set view engine to EJS
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');

// Use the body parser within the express module.
app.use(express.urlencoded({extended: true}));

// The code for SESSIONS is set up here.
app.use(session({
    secret: "Confidential information.",
    resave: false,
    saveUninitialized: false
}));

// Use the flash module.
app.use(flash());

// Initialize the passport package. Use passport in the session.
app.use(passport.initialize());
app.use(passport.session());

// ============================================================================================================


/* SECTION: USER, PROGRAM, AND EVENTS FOR DATABASE VIA MONGOOSE AND MONGODB */

// Set up a connection to the database using mongoose.
mongoose.connect("mongodb://localhost:27017/aptivDB", {useNewUrlParser: true, useUnifiedTopology: true});

// Create a mongoose schema (blueprint) for the users in the database.
const userSchema = new mongoose.Schema({
    userID: String, // --> May not need this
    firstName: String,
    lastName: String,
    username: String, // <-- USED FOR GOOGLE OAUTH; this is your EMAIL ADDRESS! FIGURE OUT HOW TO GET IT
    password: String,
    googleId: String,
    //status: String, // <-- NEED TO SET STATUS; worry about this later!!!
    userEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}]
});

// Create a mongoose schema for the programs in the database.
const programSchema = new mongoose.Schema({
    programID: String, // -->  May not need this
    programName: String,
    programDescription: String,
    programEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}] // --> Reference to the event model. Can be many events.
});

// Create a mongoose schema for the events in the database.
const eventSchema = new mongoose.Schema({
    eventID: String, // --> May not need this
    eventName: String,
    eventDate: {type: Date, default: Date.now }, // --> Will need to change this later.
    eventTime: Number,
    eventProgram: {type: mongoose.Schema.Types.ObjectId, ref: 'Program'} // --> Each unique event is only associated with one program.
});

// Create a plugin for the user Schema. Also create
// a plugin for the findOrCreate function.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Create mongoose models based on the above schemas.
const UserModel = new mongoose.model("User", userSchema);
const ProgramModel = new mongoose.model("Program", programSchema);
const EventModel = new mongoose.model("Event", eventSchema);

// ============================================================================================================


/* SECTION: AUTHENTICATE USERS AND USE GOOGLE OAUTH */

// Set up passport-local-mongoose configurations.
passport.use(UserModel.createStrategy());

// Serialize the user.
passport.serializeUser(function(user, done){
    done(null, user.id);
});

// Deserialize user.
passport.deserializeUser(function(id, done){
    UserModel.findById(id, function(err, user){
        //done(err, user);
        done(null, user);
    });
});

// Implement the verify callback function as well as other features
// for the Google OAuth package, which is applied to the Aptiv path.
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/team-aptiv", 
    //profileFields: ['id', 'displayName', 'email']
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile); // <-- Comment this out when done testing.
                                                                                                    // --> USERNAME NEEDS TO BE THE EMAIL ADDRESS!
        UserModel.findOrCreate({ googleId: profile.id, firstName: profile.name.givenName, lastName: profile.name.familyName, username: profile.id}, function (err, user) {
            return cb(err, user);
        });
    }
));

// ============================================================================================================


/* SECTION: GET INFORMATION FROM SERVER (GET) */

// Default route, which is the home page.
app.get("/", function(req, res){
    req.flash('message', 'Success!!')
    // Render the home page and determine if user is undefined.
    res.render("home", {
        user: req.user
    });
});

// Route to render the home page when the user clicks "Team Aptiv".
app.get("/home", function(req, res){

    // Render the home page and determine if user is undefined.
    res.render("home", {
        user: req.user
    });
});

// Create a route that the 'Sign Up with Google' button will direct us to.
app.get("/auth/google",

    // Initiate authentication with Google.
    passport.authenticate("google", {scope: ["profile"]})
);

// Add the Google redirect route. --> FOR USER PROFILE PAGE AS WELL
app.get("/auth/google/team-aptiv",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect to user profile page.
        res.redirect("/user_profile");
    });

// Create a route for viewing the events page for Aptiv.
app.get("/events", function(req, res){
    res.render("events");
});

// Create a route for viewing the login page for Aptiv.
app.get("/login", function(req, res){
    res.render("login");
});



// --> Try implementing flash methods
// app.get('/login', function(req,res) {
// res.render('login', {message: req.flash('message')});
// });

// <%= message %>



// Create a route for viewing the register page.
app.get("/register", function(req, res){
    res.render("register");
});

// Create a route for viewing the user profile page for Aptiv.
// Check if the user is authenticated. If not, redirect to login.
app.get("/user_profile", function(req, res){
    if(req.isAuthenticated()) {

        // Render the user profile page and determine if user is undefined.
        res.render("user_profile", {
            user: req.user
        });
    } else {
        res.redirect("/login");
    }
});

// Create a route for the user to logout of their account.
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

// // Create a route for viewing the events page.
// app.get("/events", function(req, res){

//     // Go through database and find all program, with events attached to them,
//     // and publish them on the Aptiv website.
//     User.find({"program": {$ne: null}}, function(err, foundPrograms){

//         // If there are errors, log the errors. Otherwise, if programs
//         // were found in the database with events (created by admin user),
//         // add the programs to the main 'events' page of the website.
//         if(err) {
//             console.log(err);
//         } else {
//             if(foundPrograms) {
//                 res.render("programs", {programsWithEvents: foundPrograms});
//             }
//         }
//     });
// });

// // Create a route for the user to volunteer for an event.
// app.get("/volunteer", function(req, res){

//     // Check if the user is authenticated and cleared to 
//     // sign up to volunteer for an event.
//     if(req.isAuthenticated()){
//         res.render("INSERT PAGE LINK HERE");
//     } else {
//         res.redirect("/login")
//     }
// });

// // Create a route for the user to donate to an event.
// app.get("/donate", function(req, res){

//     // Check if the user is authenticated and cleared to 
//     // sign up to volunteer for an event.
//     if(req.isAuthenticated()){
//         res.render("INSERT PAGE LINK HERE");
//     } else {
//         res.redirect("/login")
//     }
// });

// ============================================================================================================


/* SECTION: PROCESS REQUESTS MADE TO SERVER (POST) */

// Add code here. Inovles button presses, creating new events, logging in, etc.
// ...

// Create a post request for when user clicks the "Back" button.
app.post("/back", function(req, res){

    // Render the home page and determine if user is undefined.
    res.render("home", {
        user: req.user
    });
});

// Create a post request for when user clicks the "Find Events" button.
app.post("/home", function(req, res){
    res.render("events");
});

// Create a post request for when user clicks the "Register" button.
app.post("/register", function(req, res){

    // Create a new user ID for the developers to use and track. // <-- MAYBE!!!
    user_ID = mongoose.Types.ObjectId();

    // Create a new instance of the user schema 
    // to pass into the register method.
    const newUser = new UserModel({
        userID: user_ID,
        firstName: req.body.fname,
        lastName: req.body.lname,
        username: req.body.username
      });

    // Obtain the user information and, if no errors, redirect new user to profile page.
    // User info such as first and last name obtained by storing it in an object, newUser.
    UserModel.register(newUser, req.body.password, function(err, user){
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/user_profile");
            });
        }
    });
});

// Create a post request for when the user clicks the "Login" button.
app.post("/login", function(req, res){
    
    // Enable the user to login. 
    const userLogin = new UserModel({
        username: req.body.username,
        password: req.body.password
    });
            // CHECK IF YOU CAN SET IT UP SO THAT IT ONLY CHECKS IF USERNAME AND PASSWORDS EXIST IN DATABASE FOR THAT USER???
    // Check if the user is in our database. Check if user has entered the correct credentials.
    req.login(userLogin, function(err){ // --> NEED TO CREATE A CASE TO HANDLE WHEN USER ENTERS IN INCORRECT INFO.
        if(err) {                   // --> NEED TO CREATE A MESSAGE FOR THE USER WHEN THEY LOG OUT OF THEIR ACCOUNT.
            console.log(err);
            res.redirect("/home"); // --> REDIRECT TO A LOGIN PAGE THAT HAS A MESSAGE THAT TELLS THE USER THEIR LOGIN FAILED.
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/user_profile");
            });
        }
    });
});



// // --> Check if user entered correct information.
// app.post('/login',
//   passport.authenticate('local', { successRedirect: '/',
//                                    failureRedirect: '/login',
//                                    failureFlash: true })
// );

// // --> Check if user entered correct information.
// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     UserModel.findOne({ username: username }, function (err, user) {
//       if (err) { return done(err); }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));

// // --> Check if user entered correct information.
// app.get('/login', function(req, res, next) {
//     passport.authenticate('local', function(err, user, info) {
//       if (err) { return next(err); }
//       if (!user) { return res.status(401).send({"ok": false}); }
//       req.logIn(user, function(err) {
//         if (err) { return next(err); }
//         return return res.send({"ok": true});
//       });
//     })(req, res, next);
//   });


  
// Create a post request for when the user clicks the "Logout" button.
app.post("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

// ============================================================================================================


/* SECTION: LISTEN FOR SERVER REQUESTS */

// Begin listening for server requests on port 3000.
app.listen(3000, function(){
    console.log("Server for Aptiv Web App started on port 3000.");
});