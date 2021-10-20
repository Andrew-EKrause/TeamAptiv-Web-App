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
const flash = require("connect-flash");
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
app.use(express.static(__dirname + "/public")); // --> Need this for now: "__dirname"
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
    userID: String, 
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

// !!! LATER
// // Create a mongoose schema for the programs in the database.
// const programSchema = new mongoose.Schema({
//     programID: String, 
//     programName: String,
//     programDescription: String,
//     programEvents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}] // --> Reference to the event model. Can be many events.
// });

// Create a mongoose schema for the events in the database.
const eventSchema = new mongoose.Schema({
    eventID: String, 
    eventName: String,
    eventDate: {type: Date, default: Date.now},
    eventStartTime: String,
    eventEndTime: String,
    eventLocation: String,
    eventDescription: String,
    numVolunteersNeeded: Number,
    neededDonations: Number,
    // !!! LATER
    // eventProgram: {type: mongoose.Schema.Types.ObjectId, ref: 'Program'} // --> Each unique event is only associated with one program. --> CHANGE LATER
});

// Create a plugin for the user Schema. Also create
// a plugin for the findOrCreate function.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Create mongoose models based on the above schemas.
const UserModel = new mongoose.model("User", userSchema);
// const ProgramModel = new mongoose.model("Program", programSchema); // !!! LATER
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

    // Use the find function to render all of the events in your
    // Aptiv database onto the screen.
    EventModel.find({}, function(err, events){

        // Render the events on the events
        // page of the web application.
        res.render("events", { 
            user: req.user,
            events: events,
            successVolunteered: req.flash("successVolunteered"),
        });
    });
});

// Create a route for viewing the login page for Aptiv.
// This page accounts for incorret user input.
app.get("/login", function(req, res, next){

    // Create a constant for errors. Use a flash
    // message to notify the user that their login 
    // failed if they have attempted to login and 
    // have entered the wrong info.
    const errors = req.flash().error || [];
    res.render("login", { 
        errors, 
        permissionDenied: req.flash("permissionDenied"), 
        needAnAccount: req.flash("needAnAccount")
    });
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
        // Flash an error message if the regular user attempted to access 
        // the ADMIN route.
        res.render("user_profile", { user: req.user, permissionDenied: req.flash("permissionDenied") });

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

    // Create an object to store the user information in an object.
    const user = req.user

    // If the user is authenticated AND their status is set to
    // "Admin", then they can access the admin profile page.
    if(req.isAuthenticated() && user.username == ADMIN_NAME) {

        // Render the admin profile page and determine if the user is undefined.
        res.render("admin_profile", {
            user: req.user,
            successCreated: req.flash("successCreated"),
            failureNotCreated: req.flash("failureNotCreated")
        });

        // Otherwise, if the user is authenticated, redirect them to
        // their profile page and flash an error message.
    } else if (req.isAuthenticated()) {
        req.flash("permissionDenied", "You cannot access that page");
        res.redirect("/user_profile");
        return;
        
        // If the user is not authenticated, redirect them to the
        // login page and flash an error message.
    } else {
        req.flash("permissionDenied", "You cannot access that page"); // <-- !!! NOT WORKING 
        res.redirect("/login");
        return;
    }
});

// Create a route for the ADMIN event creation page.
app.get("/event_creation", function(req, res){

    const user = req.user;

    if(req.isAuthenticated() && user.username == ADMIN_NAME) {
        res.render("event_creation", {
            user: req.user
        });
    } else {
        res.redirect("/user_profile");
    }
});

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

// -------------------------------------- SINGLE EVENT SECTION (GET) -----------------------------------------------

// The following function relates to the route, NEW POSTS, created below.
// The function ALSO relates to the route, 
// The function simplifies the date displayed for each event.
// --> THIS MAY BE A TEMPORARY FUNCTION!!!
function simplifyEventDate(eventDate){
    
    // First split the event into the components that directly
    // involve the numberical representations of a date.
    var date = eventDate.toISOString().split("T")[0];

    // Create variables for workring with
    // the nubmers in the date variable.
    var arrayDate = date.split('-');
    var day = arrayDate[2];
    var getMonth = arrayDate[1];
    var month = "";
    var year = arrayDate[0];
    var simplifiedDate = "";

    // Use a series of conditionals to determine
    // what the name of the month is based on the
    // numerical representation of it.
    if(getMonth.localeCompare('1') == 0) {
        month = 'Jan';
    } else if(getMonth.localeCompare('2') == 0) {
        month = 'Feb';
    } else if(getMonth.localeCompare('3') == 0) {
        month = 'Mar';
    } else if(getMonth.localeCompare('4') == 0) {
        month = 'Apr';
    } else if(getMonth.localeCompare('5') == 0) {
        month = 'May';
    } else if(getMonth.localeCompare('6') == 0) {
        month = 'Jun';
    } else if(getMonth.localeCompare('7') == 0) {
        month = 'Jul'; 
    } else if(getMonth.localeCompare('8') == 0) {
        month = 'Aug';
    } else if(getMonth.localeCompare('9') == 0) {
        month = 'Sep';
    } else if(getMonth.localeCompare('10') == 0) {
        month = 'Oct';
    } else if(getMonth.localeCompare('11') == 0) {
        month = 'Nov';
    } else if(getMonth.localeCompare('12') == 0) {
        month = 'Dec';
    } else {
        month = 'ERROR';
    }

    // Create the simplified date and return it.
    simplifiedDate = month + " " + (day - 1) + ", " + year;
    return simplifiedDate;
}

// The following function relates to the route, NEW POSTS, created below
// it. The function takes the military time that is stored in the database
// and converts it to regular time. This conversion function is called
// in the route below that displays events on the page. 
function convertToStandardTime(eventStartTime){

    // Convert the military time for the parameter passed 
    // through the function (start and end times).
    var time = eventStartTime;

    // Convert the time into an array.
    time = time.split(':'); 

    // Create variables for the hours and minutes
    // by accessing the first and second array elements.
    var hours = Number(time[0]);
    var minutes = Number(time[1]);

    // Create a variable for calculating 
    // the regular time value.
    var timeValue;

    // Convert the military time to regular
    // time hours using the conditionals.
    if (hours > 0 && hours <= 12) {
        timeValue = "" + hours;
    } else if (hours > 12) {
        timeValue = "" + (hours - 12);
    } else if (hours == 0) {
        timeValue = "12";
    }
    
    // Get the minutes for the time and determine whether it is in AM or PM
    timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  
    timeValue += (hours >= 12) ? " P.M." : " A.M."; 

    // Return the converted time variable value.
    return timeValue;
}

// Create a get request route for NEW POSTS.
app.get("/events/:eventId", function(req, res){
  
    // Create a constant for storing the post ID so that it
    // can be retrieved from the database.
    const requestedEventId = req.params.eventId;
  
    // Use the findOne function to find the post that the user
    // wishes to view from the database based on the post ID.
    // The method will look for the post that matches the ID
    // that was requested indirectly by the user and render
    // that post on the screen.
    EventModel.findOne({_id: requestedEventId}, function(err, event){
      
        // Call a function to simplify the date of the event.
        const eventDate = simplifyEventDate(event.eventDate);

        // Call a function to to convert the event start time and event 
        // end time, both in military time, to regular time.
        const eventStartTime = convertToStandardTime(event.eventStartTime);
        const eventEndTime = convertToStandardTime(event.eventEndTime);
    
        // Render the post that was requested by the user on 
        // the website.
        res.render("specific_event", {
            user: req.user,
            eventID: event.id, // --> THIS IS EXTREMELY IMPORTANT TO ADDING THE EVENT TO THE USER'S PAGE!!!
            eventName: event.eventName,
            eventDate: eventDate,
            eventStartTime: eventStartTime,
            eventEndTime: eventEndTime,
            eventLocation: event.eventLocation,
            eventDescription: event.eventDescription,
            numVolunteersNeeded: event.numVolunteersNeeded,
            neededDonations: event.neededDonations
        });
    });
});


// ============================================================================================================


/* SECTION: PROCESS REQUESTS MADE TO SERVER (POST) */

// Create a post request for when user clicks any "Back" button.
app.post("/back", function(req, res){

    // Render the home page and determine if user is undefined.
    res.redirect("/home");
});

// Create a post request for when user clicks the "Find Events" button.
app.post("/find_events", function(req, res){
    res.redirect("/events");
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

    // Check if the username is the ADMIN username.
    if(user.username == ADMIN_NAME) {
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

// Create a post request for when the user clicks the "Back to Events" button.
app.post("/back_events", function(req, res){
    res.redirect("/events");
});

// -------------------------------------- ADMIN SECTION (POST) -----------------------------------------------

// Create a post request for the ADMIN so that they can 
// access the "event creation" page on the web application.
app.post("/create_event", function(req, res){
    res.redirect("/event_creation");
});

// Create a post request for the ADMIN so when they want to 
// add an event, that event is added to the database.
app.post("/added_event", function(req, res){

    // Create a new event ID for the developers to use and track. // <-- MAYBE!!!
    event_ID = mongoose.Types.ObjectId();

    // MAYBE ADD CHECKS AT SOME POINT TO DETERMINE IF AN EVENT WAS ALREADY CREATED

    // Create a new event based on the event schema.
    const newEvent = new EventModel({
        eventID: event_ID,
        eventName: req.body.eventname,
        eventDate: req.body.eventdate,
        eventStartTime: req.body.eventstarttime,
        eventEndTime: req.body.eventendtime,
        eventLocation: req.body.eventlocation,
        eventDescription: req.body.eventdescription,
        numVolunteersNeeded: req.body.eventvolunteers,
        neededDonations: req.body.eventdonations
    });

    // Save the new event created by the ADMIN 
    // to the database. 
    newEvent.save(function(err){
    
        // If there is no error in saving the new event, redirect
        // back to the "root"/"HOME" route of the webpage.
        if(!err) {
            req.flash("successCreated", "Event created");
            res.redirect("/admin_profile");
            return;
        } else {
            req.flash("failureNotCreated", "Failed to create event");
            res.redirect("/admin_profile");
            console.log(err);
            return;
        }
    });
});

// Create a post request for when the ADMIN wants to cancel 
// creating a new event.
app.post("/cancel", function(req, res){
    res.redirect("/admin_profile");
});

// ---------------------------------- USER VOLUNTEER SIGN-UP (POST) -------------------------------------------

// Create a route for when the user wants to sign up for a particular event.
app.post("/volunteer", function(req, res){

    // YOU WILL NEED TO CHECK AND MAKE SURE THAT THE USER HAS NOT ALREADY VOLUNTEERED/DONATED TO AN EVENT.
    // THIS PART IS NOT COMPLETED YET!!!

    // const requestedEventId = req.params.eventId;
    // console.log(requestedEventId);

    // Check if the user is authenticated. If user is authenticated, display a
    // confirmation message and add the event to the user's list of events.
    if(req.isAuthenticated()) {

        // Create a flash message informing the user 
        // that they have signed up for an event.
        req.flash("successVolunteered", "You have signed up for the event");

        // UserModel.findById(req.user, function(err, user, record) {
            
            
        //     console.log(user);

        // });

        // EventModel.findById(req.event, function(err, event) {

        // });

        res.redirect("/events");

    } else {
        req.flash("needAnAccount", "You need an account to volunteer.");
        res.redirect("/login");
    }
});




// // Create a get request route for NEW POSTS.
// app.get("/events/:eventId", function(req, res){
  
//     // Create a constant for storing the post ID so that it
//     // can be retrieved from the database.
//     const requestedEventId = req.params.eventId;
  
//     // Use the findOne function to find the post that the user
//     // wishes to view from the database based on the post ID.
//     // The method will look for the post that matches the ID
//     // that was requested indirectly by the user and render
//     // that post on the screen.
//     EventModel.findOne({_id: requestedEventId}, function(err, event){
      
//         // Call a function to simplify the date of the event.
//         const eventDate = simplifyEventDate(event.eventDate);

//         // Call a function to to convert the event start time and event 
//         // end time, both in military time, to regular time.
//         const eventStartTime = convertToStandardTime(event.eventStartTime);
//         const eventEndTime = convertToStandardTime(event.eventEndTime);
    
//         // Render the post that was requested by the user on 
//         // the website.
//         res.render("specific_event", {
//             user: req.user,
//             eventID: event.id, // --> THIS IS EXTREMELY IMPORTANT TO ADDING THE EVENT TO THE USER'S PAGE!!!
//             eventName: event.eventName,
//             eventDate: eventDate,
//             eventStartTime: eventStartTime,
//             eventEndTime: eventEndTime,
//             eventLocation: event.eventLocation,
//             eventDescription: event.eventDescription,
//             numVolunteersNeeded: event.numVolunteersNeeded,
//             neededDonations: event.neededDonations
//         });
//     });
// });
// --> !!! LATER Create a route for when the user wants to donate to a particular event.


// ============================================================================================================


/* SECTION: LISTEN FOR SERVER REQUESTS */

// Begin listening for server requests on port 3000.
app.listen(3000, function(){
    console.log("Server for Aptiv Web App started on port 3000.");
});