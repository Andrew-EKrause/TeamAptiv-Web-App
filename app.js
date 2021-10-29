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
// const popupS = require("popups"); // --> WORRY ABOUT THIS LATER
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
    userID: { type: String, unique: true, sparse: true }, 
    firstName: String,
    lastName: String,
    picture: String,
    username: { type: String, unique: true, sparse: true },
    password: String,
    googleId: String,
    status: {
        type: [String],
        default: ["Volunteer"] 
    }, // --> STATUS WAS ORIGINALLY CALLED 'ROLE'
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
        done(null, user);
    });
});

// Implement the verify callback function as well as other features
// for the Google OAuth package, which is applied to the Aptiv path.
// IMPORTANT: When a user uses OAuth to create an account/sign in,
// they will only have 9 fields in the database. We do not worry about
// the username and user_ID being stored in our database. Google 
// handles the security features for the username and password fields.
// Users that DO NOT use Google OAuth will have 10 fields in the db.
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/team-aptiv", 
    },
    function(accessToken, refreshToken, profile, cb) {
    
        // Generate a unique id for the user using Google OAuth.
        user_ID = mongoose.Types.ObjectId();

        // Find if user already exists and log in. Otherwise, create new user account for site.
        UserModel.findOrCreate({googleId: profile.id, firstName: profile.name.givenName, lastName: profile.name.familyName, picture: profile._json.picture, username: profile.id}, function (err, user) {
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

    // If the user is authenticated and is admin, redirect to admin page.
    if(req.isAuthenticated() && user.username == ADMIN_NAME) {

        // Redirect the ADMIN profile page and determine if ADMIN is undefined.
        // res.redirect("/admin_profile");








        // Create variables to help with storing  
        // the events associated with a given ADMIN.
        const userEventIds = user.userEvents;
        var listOfUserEvents = [];

        // If the ADMIN has events they have signed up for, display the events
        // on the ADMIN's profile page. However, if the ADMIN has not signed up
        // for any events and has none, simply display the ADMIN's profile.
        if(userEventIds.length > 0) {

            // Create variables to track the objects in the database and
            // to determine when to display the objects in the user profile.
            var i = 0;
            j = userEventIds.length;

            // Go through the objects stored in the given ADMIN collection and
            // look them up in the database by their ID. Then add the objects
            // found as a result of the lookup to a list and pass it to the page.
            for(i = 0; i < userEventIds.length; i++) {

                // Use the find by ID function to return the event object for the ADMIN.
                EventModel.findById(userEventIds[i], function(err, results){
                    if(err) {
                        console.log(err);
                    } else {
                        listOfUserEvents.push(results);
                        j -= 1;
                    }

                    // The counter 'j' determines when the results should be returned 
                    // from the callback function and rendered on the ADMIN profile page.
                    if (j == 0) {

                        // Render the ADMIN profile page and determine if ADMIN is undefined.
                        res.redirect("/admin_profile", {  
                            user: req.user, 
                            listOfUserEvents: listOfUserEvents,
                            permissionDenied: req.flash("permissionDenied") 
                        });
                    }
                });
            }

        } else {
            res.redirect("/admin_profile", {  
                user: req.user, 
                listOfUserEvents: listOfUserEvents,
                permissionDenied: req.flash("permissionDenied") 
            });
        }













    } else if(req.isAuthenticated()) {

        // Create variables to help with storing  
        // the events associated with a given user.
        const userEventIds = user.userEvents;
        var listOfUserEvents = [];

        // If the user has events they have signed up for, display the events
        // on the user's profile page. However, if the user has not signed up
        // for any events and has none, simply display the user's profile.
        if(userEventIds.length > 0) {

            // Create variables to track the objects in the database and
            // to determine when to display the objects in the user profile.
            var i = 0;
            j = userEventIds.length;

            // Go through the objects stored in the given user collection and
            // look them up in the database by their ID. Then add the objects
            // found as a result of the lookup to a list and pass it to the page.
            for(i = 0; i < userEventIds.length; i++) {

                // Use the find by ID function to return the event object for the user.
                EventModel.findById(userEventIds[i], function(err, results){
                    if(err) {
                        console.log(err);
                    } else {
                        listOfUserEvents.push(results);
                        j -= 1;
                    }

                    // The counter 'j' determines when the results should be returned 
                    // from the callback function and rendered on the user profile page.
                    if (j == 0) {

                        // Render the user profile page and determine if user is undefined.
                        // Flash an error message if the regular user had previously  
                        // attempted to access the ADMIN route.
                        res.render("user_profile", {  
                            user: req.user, 
                            listOfUserEvents: listOfUserEvents,
                            permissionDenied: req.flash("permissionDenied") 
                        });
                    }
                });
            }

        } else {
            res.render("user_profile", {  
                user: req.user, 
                listOfUserEvents: listOfUserEvents,
                permissionDenied: req.flash("permissionDenied") 
            });
        }

    } else {
        res.redirect("/login");
    }
});

// Create a route for the user to logout of their account.
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

        // Create variables to help with storing  
        // the events associated with an ADMIN.
        const userEventIds = user.userEvents;
        var listOfUserEvents = [];

        // If the ADMIN has events they have signed up for, display the events
        // on the ADMIN's profile page. However, if the ADMIN has not signed up
        // for any events and has none, simply display the ADMIN's profile.
        if(userEventIds.length > 0) {

            // Create variables to track the objects in the database and
            // to determine when to display the objects in the ADMIN profile.
            var i = 0;
            j = userEventIds.length;

            // Go through the objects stored in the given ADMIN collection and
            // look them up in the database by their ID. Then add the objects
            // found as a result of the lookup to a list and pass it to the page.
            for(i = 0; i < userEventIds.length; i++) {

                // Use the find by ID function to return the event object for the ADMIN.
                EventModel.findById(userEventIds[i], function(err, results){
                    if(err) {
                        console.log(err);
                    } else {
                        listOfUserEvents.push(results);
                        j -= 1;
                    }

                    // The counter 'j' determines when the results should be returned 
                    // from the callback function and rendered on the user profile page.
                    if (j == 0) {

                        // Render the ADMIN profile page and determine if ADMIN is undefined.
                        res.render("admin_profile", {  
                            user: req.user, 
                            listOfUserEvents: listOfUserEvents,
                            successCreated: req.flash("successCreated"),
                            failureNotCreated: req.flash("failureNotCreated")
                        });
                    }
                });
            }

        } else {
            res.render("admin_profile", {  
                user: req.user, 
                listOfUserEvents: listOfUserEvents,
                successCreated: req.flash("successCreated"),
                failureNotCreated: req.flash("failureNotCreated")
            });
        }

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

/* SECTION WITHIN GET: FUNCTIONS FOR SIMPLIFYING THE DATE/TIME DISPLAY OF EVENTS */

// The following function relates to the route, NEW POSTS, created below.
// The function ALSO relates to the route, 
// The function simplifies the date displayed for each event.
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

/* SECTION WITHIN GET: RENDERING A PAGE ON THE SCREEN SPECIFIC TO AN EVENT */

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
            eventID: event.id,
            eventName: event.eventName,
            eventDate: eventDate,
            eventStartTime: eventStartTime,
            eventEndTime: eventEndTime,
            eventLocation: event.eventLocation,
            eventDescription: event.eventDescription,
            numVolunteersNeeded: event.numVolunteersNeeded,
            neededDonations: event.neededDonations,
            successVolunteered: req.flash("successVolunteered"),
            alreadyVolunteered: req.flash("alreadyVolunteered"),
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
                    status: "ADMIN"
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

// Create a route for when the user wants to volunteer for a particular event.
app.post("/volunteer", function(req, res){

    // YOU WILL NEED TO CHECK AND MAKE SURE THAT THE USER DONATED TO AN EVENT.
    // THIS PART IS NOT COMPLETED YET!!!

    // Obtain the specific event id from the webpage 
    // when the user clicks on the 'volunteer' button.
    const requestedEventId = req.body.eventvolunteer;

    // Check if the user is authenticated. If user is authenticated, display a
    // confirmation message and add the event to the user's list of events.
    if(req.isAuthenticated()) {

        // Create variables to help add the event 
        // to the user collection in the database.
        var user = req.user;
        var eventToAdd = req.body.eventvolunteer;
        var listOfUserEvents = user.userEvents;

        // Create a variable to represent whether the user 
        // has already signed up for the event or not.
        var alreadyAdded = false;

        // Go through the list of events in the user events attribute
        // and check if the event is already in the user db.
        listOfUserEvents.forEach(function(eventInUserProfile) {

            // Check if the event already exists in the user's events section.
            if(String(eventInUserProfile) == String(eventToAdd)) {
                alreadyAdded = true;
            } 
        });

        // If the user has NOT already been added, add the user.
        if(alreadyAdded == false) {
            // Add the event to the user's profile so that you can list
            // the event that the user volunteered for in their profile.
            UserModel.findOneAndUpdate(
                { _id: user.id }, 
                { $push: { userEvents: eventToAdd  } },
                function (error, success) {
                    if (error) {
                        console.log("Error: " + error);
                    } else {
                        //console.log("Success: " + success);
                    }
                }
            );

            // Create a flash message informing the user 
            // that they have signed up for an event.
            req.flash("successVolunteered", "You have signed up for the event");

            // Redirect to the specific event page of the website.
            res.redirect("/events/" + requestedEventId);

        } else {
            // Create a flash message for the specific event page informing 
            // the user that they already signed up for the event.
            req.flash("alreadyVolunteered", "You have already signed up for this event");
            res.redirect("/events/" + requestedEventId);
        }

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