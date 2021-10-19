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
const flash = require("connect-flash"); // --> MAY NOT NEED THIS
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

// Create a string for the current ADMIN username.
const ADMIN_NAME = "$ADMIN$@ACCOUNT-2023";

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

// Use the flash module to transmit messages 
// to the user as well as the developers.
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
    picture: String,
    username: String, // <-- USED FOR GOOGLE OAUTH; this is your EMAIL ADDRESS! FIGURE OUT HOW TO GET IT
    password: String,
    googleId: String,
    role: {
        type: [String],
        default: ["Volunteer"] // <-- NEED TO SET STATUS; worry about this later!!! Figure out how to set default!
    },
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
        //done(err, user); // --> Potential alternative
        done(null, user);
    });
});

// Implement the verify callback function as well as other features
// for the Google OAuth package, which is applied to the Aptiv path.
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/team-aptiv", 
    //profileFields: ['id', 'displayName', 'email'] // --> DON'T THINK YOU NEED THIS!!!
    },
    function(accessToken, refreshToken, profile, cb) {
        // console.log(profile); // <-- Comment this out unless testing.
                                                                                                    // --> USERNAME NEEDS TO BE THE EMAIL ADDRESS!
        UserModel.findOrCreate({ googleId: profile.id, firstName: profile.name.givenName, lastName: profile.name.familyName, picture: profile._json.picture, username: profile.username}, function (err, user) {
            return cb(err, user);
        });
    }
));

// ============================================================================================================


/* SECTION: GET INFORMATION FROM SERVER (GET) */

// Default route, which is the home page.
app.get("/", function(req, res){
    // Render the home page and determine if user is undefined.
    res.render("home", { user: req.user });
});

// Route to render the home page when the user clicks "Team Aptiv".
app.get("/home", function(req, res){
    // Render the home page and determine if user is undefined.
    res.render("home", { user: req.user });
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
    res.render("events", { user: req.user });
});

// Create a route for viewing the login page for Aptiv.
// This page accounts for incorret user input.
app.get("/login", function(req, res, next){

    // Create a constant for errors. Use a flash
    // message to notify the user that their login 
    // failed if they have attempted to login and 
    // have entered the wrong info.
    const errors = req.flash().error || [];
    res.render("login", { errors });
});

// Create a route for viewing the register page. If the account already
// exists, alert the user that they cannot use that account as their own.
app.get("/register", function(req, res){
    res.render("register", {alreadyCreated: req.flash("alreadyCreated")});
});

// Create a route for viewing the user profile page for Aptiv.
// Check if the user is authenticated. If not, redirect to login.
app.get("/user_profile", function(req, res){

    // Create an object to store the user information in an object.
    const user = req.user

    if(req.isAuthenticated() && user.username == ADMIN_NAME) {

        // Render the user profile page and determine if user is undefined.
        res.redirect("/admin_profile");
        
    } else if(req.isAuthenticated()) {

        // Render the user profile page and determine if user is undefined.
        res.render("user_profile", {
            user: req.user
        });

    } else {
        res.redirect("/login");
    }
});

// Create a route for the user to logout of their account. <-- EVEN NEED THIS???
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/login");
});

// -------------------------------------- ADMIN SECTION (GET) -----------------------------------------------

// Create a route for the admin profile. For this route, include some
// layers of security so that the user cannot access the Admin profile
// unless they are the admin.
app.get("/admin_profile", function(req, res){

    // console.log("In admin profile route"); // --> Debugging statement
    // console.log("State of admin name: " + user.username); // --> Debugging statement

    // Create an object to store the user information in an object.
    const user = req.user

    // If the user is authenticated AND their status is set to
    // "Admin", then they can access the admin profile page.
    if(req.isAuthenticated() && user.username == ADMIN_NAME) {

        // Render the admin profile page and determine if the user is undefined.
        res.render("admin_profile", {
            user: req.user
        });

        // Otherwise, if the user is authenticated, redirect them to
        // their profile page and flash an error message.
    } else if (req.isAuthenticated()) {
        // req.flash("permissionDenied", "You cannot access this page");
        res.redirect("/user_profile");
        
        // If the user is not authenticated, redirect them to the
        // login page and flash an error message.
    } else {
        // req.flash("permissionDenied", "You cannot access this page");
        res.redirect("/login");
    }
});

// // Create a route for viewing the events page.
// app.get("/events", function(req, res){

//     // Go through database and find all program, with events attached to them,
//     // and publish them on the Aptiv website.
//     ProgramModel.find({"program": {$ne: null}}, function(err, foundPrograms){

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

// Create a post request for when user clicks any "Back" button.
app.post("/back", function(req, res){

    // Render the home page and determine if user is undefined.
    res.render("home", { user: req.user });
});

// Create a post request for when user clicks the "Find Events" button.
app.post("/find_events", function(req, res){
    res.render("events", { user: req.user });
});

// Create a post request for when user clicks the "Register" button.
// This route will determine whether the user registering for an account
// is a regular user or an ADMIN. The route also determines if accounts
// already exist.
app.post("/register", function(req, res){
    
    // Create a new user ID for the developers to use and track. // <-- MAYBE!!!
    user_ID = mongoose.Types.ObjectId();

    // Check if the username being used to register a new account
    // already exists in the database for the Team Aptiv site.
    UserModel.countDocuments({username: req.body.username}, function (err, count){ 
        
        // If the count is greater than zero, the user already exists.
        // Otherwise, create a new user and add that user to the database.
        if(count > 0) {

            req.flash("alreadyCreated", "Cannot use that account");
            res.redirect("/register");
            return;

        } else {

            // Check if the user registering is the ADMIN. If the user regisering is the ADMIN,
            // create their account and redirect them to their unique ADMIN profile page.
            if(req.body.username == ADMIN_NAME) {

                // Create a new instance of the user schema 
                // specifically for the ADMIN.
                const adminUser = new UserModel({
                    userID: user_ID,
                    firstName: req.body.fname,
                    lastName: req.body.lname,
                    username: req.body.username,
                    role: "ADMIN"
                });

                // Obtain the ADMIN user information and, if no errors, redirect ADMIN to their page.
                // User info such as first and last name obtained by storing it in an object, adminUser.
                UserModel.register(adminUser, req.body.password, function(err, user){
                    if(err) {
                        console.log(err);
                        res.redirect("/register");
                    } else {
                        passport.authenticate("local")(req, res, function(){
                            res.redirect("/admin_profile");
                            console.log("Current state: " + req.body.username)
                        });
                    }
                });
            } else {

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
            }
        }
    });
});

// Create a post request for when the user clicks the "Login" button.
app.post("/login", passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
}), (req, res, next) => {

    // Create an object to store the user information in an object.
    const user = req.user
    console.log(user.username)

    if(user.username == ADMIN_NAME) { // <-- THIS MAY BE WRONG
        res.redirect("/admin_profile");
    } else {
        res.redirect("/user_profile");
    }
});

// Take the user to their profile page when they
// click the button on the "events" page.
app.post("/see_profile", function(req, res){
    res.redirect("/user_profile")
});

// Create a post request for when the user clicks the "Logout" button.
app.post("/logout", function(req, res){
    req.logout();
    res.redirect("/login");
});

// -------------------------------------- ADMIN SECTION (POST) -----------------------------------------------


// ============================================================================================================


/* SECTION: LISTEN FOR SERVER REQUESTS */

// Begin listening for server requests on port 3000.
app.listen(3000, function(){
    console.log("Server for Aptiv Web App started on port 3000.");
});