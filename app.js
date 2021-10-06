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
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

// Require additional security packages for login information
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate"); // --> If code directly above does not work, run this code.

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

// Initialize the passport package. Use passport in the session.
app.use(passport.initialize());
app.use(passport.session());

// ============================================================================================================


/* SECTION: USER, PROGRAM, AND EVENTS FOR DATABASE VIA MONGOOSE AND MONGODB */

// Set up a connection to the database using mongoose.
mongoose.connect("mongodb://localhost:27017/aptivDB", {useNewUrlParser: true, useUnifiedTopology: true});
// mongoose.set('useCreateIndex', true); --> DEPRECATED

// Create a mongoose schema (blueprint) for the users in the database.
const userSchema = new mongoose.Schema({
    // id: Number, // --> May not need this
    // firstName: String,
    // lastName: String,
    email: String,
    password: String,
    googleId: String,
    userEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}]
});

// Create a plugin for the user Schema.
userSchema.plugin(passportLocalMongoose);

// Create a mongoose schema for the programs in the database.
const programSchema = new mongoose.Schema({
    id: Number, // -->  May not need this
    programName: String,
    programDescription: String,
    programEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}] // --> Reference to the event model. Can be many events.
});

// Create a mongoose schema for the events in the database.
const eventSchema = new mongoose.Schema({
    id: Number, // --> May not need this
    eventName: String,
    eventDate: {type : Date, default: Date.now }, // --> Will need to change this later.
    eventTime: Number,
    eventProgram: {type: mongoose.Schema.Types.ObjectId, ref: 'Program'} // --> Each unique event is only associated with one program.
});

// Create mongoose models based on the above schemas.
const UserModel = new mongoose.model("User", userSchema);
const ProgramModel = new mongoose.model("Program", programSchema);
const EventModel = new mongoose.model("Event", eventSchema);

// Set up passport-local-mongoose configurations.
passport.use(UserModel.createStrategy());

// Serialize the user.
passport.serializeUser(UserModel.serializeUser());

// Deserialize user.
passport.deserializeUser(UserModel.deserializeUser());

// // Implement the verify callback function as well as other features
// // for the Google OAuth package.
// passport.use(new GoogleStrategy({
//     clinetID: process.env.CLIENT_ID, // --> May need to change
//     clientSecret: process.env.CLIENT_SECRET, // --> May need to change
//     callbackURL: "http://localhost:3000/auth/google/secrets", // --> May need to change
//     userProfileURL: "https//www.googleapis.com/oauth2/v3/userinfo" // --> May need to change
//     },
//     function(accessToken, refreshToken, profile, cb) {
//         console.log(profile);

//         User.findOrCreate({ googleId: profile.id }, function (err, user) {
//             return cb(err, user);
//         });
//     }
// ));

// ============================================================================================================


/* SECTION: GET INFORMATION FROM SERVER (GET) */

// Default route, which is the home page.
app.get("/", function(req, res){

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

// // Create a route that the 'Sign Up with Google' button will direct us to.
// app.get("/auth/google",

//     // Initiate authentication with Google.
//     passport.authenticate("google", { scope: ["profile"] })
// );

// // Add the Google redirect route. --> FOR USER PROFILE PAGE AS WELL
// app.get("/auth/google/secrets",
//     passport.authenticate("google", { failureRedirect: "/login" }),
//     function(req, res) {
//         // Successful authentication, redirect to user profile page.
//         res.redirect("/user_profile");
//     });

// Create a route for viewing the events page for Aptiv.
app.get("/events", function(req, res){
    res.render("events");
});

// Create a route for viewing the login page for Aptiv.
app.get("/login", function(req, res){
    res.render("login");
});

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

// // Create a route for going back to the home page when the user
// // clicks the "logout" button. Deauthenticate user.
// app.get("/logout", function(req, res){
//     req.logout();
//     res.redirect("/");
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

    // Obtain the user information and, if no errors, redirect new user to profile page.
    UserModel.register({fname: req.body.fname, lname: req.body.lname, username: req.body.username}, req.body.password, function(err, user){
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
    const user = new UserModel({
        fname: req.body.fname, // --> MAY NOT NEED THIS
        lname: req.body.lname, // --> MAY NOT NEED THIS
        username: req.body.username,
        password: req.body.password
    });

    // Check if the user is in our database. Check if user has entered the correct credentials.
    req.login(user, function(err){ // --> NEED TO CREATE A CASE TO HANDLE WHEN USER ENTERS IN INCORRECT INFO.
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