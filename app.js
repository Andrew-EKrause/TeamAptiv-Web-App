/**
 * The app.js file contains the core processes
 * that create the different features of the
 * Team Aptiv web application. The file is, in
 * essence, the server code that connects to the
 * MongoDB database as well as handles different
 * requests to the web application. Given the
 * numerous lines of code in this file, sections
 * have been used to break apart the different
 * functionalities. To understand the code, read
 * the comments throughout the app.js file and
 * analyze the information section by section.
 * ----------------------------------------------------------------------------------
 * The first section contains the installed
 * packages used to help run the server for
 * the website application. The second section
 * defines different schemas (blueprints) for
 * the types of documents that will be stored
 * in the database and connects to the database.
 * The third section contains the information
 * that enables the web application to utilize
 * Google OAuth so that the user can register
 * or login using their Google account. The
 * fourth section contains a series of get
 * requests. These requests are used to render
 * the initial state of a page in the browser.
 * Within the fourth section, the fifth section
 * is used to account for the admin account in
 * terms of get requests. The sixth section, also
 * contained within the fourth section, is used
 * to create a get request for a specific event
 * when it is regarded by the user. A function
 * for simplifying the date and time display
 * exists in the seventh section (contained
 * within the fourth section). The eigth
 * section, also contained within section four,
 * helps with the process of rendering a specifc
 * event on the page. The ninth section handles
 * the post requests made to the server, which
 * is used to handle events that occur after
 * the initial state (for example, the user
 * clicking a button would be  handled by a
 * post request route). Contained within the
 * ninth section are the tenth and eleventh
 * sections, which handle the admin information
 * for post requests and the user volunteer sign
 * up for post requests respectively. The twelfth
 * section contains code for listening for server
 * requests.
 * ----------------------------------------------------------------------------------
 * The sections present in the code are listed
 * below in order in all caps:
 *
 * -1 SECTION: INSTALLED PACKAGES AND INITIALIZATION
 * -2 SECTION: USER, PROGRAM, AND EVENTS FOR DATABASE VIA MONGOOSE AND MONGODB
 * -3 SECTION: AUTHENTICATE USERS AND USE GOOGLE OAUTH
 * -4 SECTION: GET INFORMATION FROM SERVER (GET) --> Has sections within it
 * -->5 ADMIN SECTION (GET)
 * -->6 SINGLE EVENT SECTION (GET)
 * -->7 SECTION WITHIN GET: FUNCTIONS FOR SIMPLIFYING THE DATE/TIME DISPLAY OF EVENTS
 * -->8 SECTION WITHIN GET: RENDERING A PAGE ON THE SCREEN SPECIFIC TO AN EVENT
 * -9 SECTION: PROCESS REQUESTS MADE TO SERVER (POST) --> Has sections within it
 * -->10 ADMIN SECTION (POST)
 * -->11 USER VOLUNTEER SIGN-UP (POST)
 * -12 SECTION: LISTEN FOR SERVER REQUESTS
 * ----------------------------------------------------------------------------------
 *
 * Project: Aptiv Web Application
 * Authors: Andrew Krause, Riley Radle,
 * Anthony Musbach, Zach Gephart
 * Class: Software Design IV (CS 341)
 * Group: #2
 * Date: 12/15/2021
 *
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
// const { times } = require('async'); // --> NOT USING THIS FOR NOW

// Create a string for the current ADMIN username.
const ADMIN_NAME = "$ADMIN$@ACCOUNT-2023";

// Create a string for the only organization item.
// Also create a boolean to determine if org data item exists.
const TEAM_APTIV = "Team-Aptiv-Org";

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
   
    // User identification number.
    userID: {
        type: String,
        unique: true,
        sparse: true 
    },

    // MAY HAVE TO CREATE ANOTHER ID FIELD...

    // First name, last name, and picture of user.
    firstName: String,
    lastName: String,
    picture: String,

    // Username of user.
    username: {
        type: String,
        unique: true,
        sparse: true 
    },

    // Password and google identification number of user.
    password: String,
    googleId: String,

    // Status of user. Default status is "Volunteer"
    status: {
        type: String,
        default: "Volunteer" 
    },

    // Array of times that the user is attending.
    // Also contains the date of the event.
    timesAttending: [{
        type: String,
        unique: true,
        sparse: true
    }],

    // Array of the event identification numbers user has signed up for.
    userEvents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }]
});

// Create a mongoose schema for the main organization. This
// Schema is created for the sole purpose of receiving unrestricted
// donations for users.
const orgSchema = new mongoose.Schema({

    // Create organization id, name, and received donations.
    orgID: String,
    orgName: String,
    receivedDonations: Number 
});

// Create a mongoose schema for the events in the database.
const eventSchema = new mongoose.Schema({
   
    // Identification number and name of event.
    eventID: String,
    eventName: String,

    // Date of event.
    eventDate: {
        type: Date,
        default: Date.now
    },

    // Labels for the event start and end time.
    eventStartTime: String,
    eventEndTime: String,

    // Array for the time slots available.
    eventTimeIncrements: [{
        type: String,
        unique: true,
        sparse: true
    }],

    // Location, description, needed volunteers and needed donations
    eventLocation: String,
    eventDescription: {
        type: String,
        unique: true,
        sparse: true
    },
    numVolunteersNeeded: Number,
    neededDonations: Number,

    // Users who have volunteered for the event.
    numVolunteers: {
        type: Number,
        default: 0
    },

    // Donations received for the event.
    numDonations: {
        type: Number,
        default: 0
    }
});

// Create a plugin for the user Schema. Also create
// a plugin for the findOrCreate function.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Create mongoose models based on the above schemas.
const UserModel = new mongoose.model("User", userSchema);
const OrgModel = new mongoose.model("Org", orgSchema);
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
        var user_ID = mongoose.Types.ObjectId();
        var user_IDString = user_ID.toString();

        // Use the "findOne" method to check if the user already
        // exists in the user database. If the user does not already
        // exist, then create a new user and add the user to the db.
        UserModel.findOne({
            googleId: profile.id 
        }, function(err, user) {
            if (err) {
                return cb(err);
            }
            // If no user was found, create a new user using the findOrCreate method.
            if (!user) {
 
                // Use the method to create a new user for the web app. In this
                // case, the "find" in the "findOrCreate" is never used for the site.
                UserModel.findOrCreate({googleId: profile.id, firstName: profile.name.givenName, lastName: profile.name.familyName, picture: profile._json.picture, username: user_ID}, function (err, user) {

                    // If the user has not already been created, update the timesAttending array
                    // by adding a unique id to it as the first element in order to maintain uniqueness.
                    if(user.timesAttending.length == 0) {

                        // Add the initial id to the user's timeslots attribute.
                        UserModel.findOneAndUpdate(
                            { _id: user.id },
                            { $push: { timesAttending: user_IDString } },                   
                            function (error, success) {
                                if (error) {
                                    console.log("Error: " + error);
                                } else {
                                    // console.log("User Success: " + success);
                                }
                            }
                        );
                    }

                    return cb(err, user);
                });

            } else {
                //found user. Return
                return cb(err, user);
            }
        });

        // MAYBE DELETE LATER. --> KEEP FOR NOW JUST IN CASE.
        // // Find if user already exists and log in. Otherwise, create new user account for site.
        // UserModel.findOrCreate({googleId: profile.id, firstName: profile.name.givenName, lastName: profile.name.familyName, picture: profile._json.picture, username: user_ID}, function (err, user) {

        //     // If the user has not already been created, update the timesAttending array
        //     // by adding a unique id to it as the first element in order to maintain uniqueness.
        //     if(user.timesAttending.length == 0) {
        //           // Remove the timelot from the user's database.
        //           UserModel.findOneAndUpdate(
        //             { _id: user.id },
        //             { $push: { timesAttending: user_IDString } },                   
        //             function (error, success) {
        //                 if (error) {
        //                     console.log("Error: " + error);
        //                 } else {
        //                     // console.log("User Success: " + success);
        //                 }
        //             }
        //         );
        //     }
        //     return cb(err, user);
        // });

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

    // Determine how many documents exist in the org model.
    // Create ONE org document if there are none that exist.
    OrgModel.find().count(function(err, count){

        // If the count is greater than zero, the org already exists.
        // Otherwise, create a new org and add that org to the database.
        if(count > 0) {
            return;
        } else {

            // Create a new identifier for the organization object.
            var org_ID = mongoose.Types.ObjectId();

            // Create the new organization data model.
            const newOrg = new OrgModel({
                orgID: org_ID,
                orgName: TEAM_APTIV,
                receivedDonations: 0
            });

            // Save the new organization to the database.
            newOrg.save(function(err, result){
                if (err){
                    console.log(err);
                }
            });
        }
    });
    // Render the home page and determine if user is undefined.
    res.render("home", { user: req.user });
});

// Create a route that the 'Sign Up with Google' button will direct us to.
app.get("/auth/google",
    // Initiate authentication with Google.
    passport.authenticate("google", {scope: ["profile"]})
);

// Add the Google redirect route.
app.get("/auth/google/team-aptiv",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect to user profile page.
        res.redirect("/user_profile");
});

// Create a route to allow the user to download
// the user help manual from the web application.
app.get("/download_help", function(req, res){

    // Download the help manual (PDF) file stored for website.
    const file = `${__dirname}/public/files/TEMPORARY.pdf`;
    res.download(file);
});

// Create a route for the user to view the 'about'
// page and make an unrestricted donation.
app.get("/about", function(req, res){

    // See if the data model exists and pass that
    // through to the about page that is rendered.
    OrgModel.find({}, function(err, events){
        // Render the about page and create
        // a data model behind the scenes.
        res.render("about_unrestricted", {
            user: req.user,
            events: events,
            thanksForDonation: req.flash("thanksForDonation")
        });
    });
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
        res.redirect("/admin_profile");

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
                            permissionDenied: req.flash("permissionDenied") ,
                            sucessCancelled: req.flash("sucessCancelled")

                        });
                    }
                });
            }

        } else {
            res.render("user_profile", {  
                user: req.user,
                listOfUserEvents: listOfUserEvents,
                permissionDenied: req.flash("permissionDenied"),
                sucessCancelled: req.flash("sucessCancelled")

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
            var j = userEventIds.length;

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

            // If there are no events for the admin, then
            // render the admin profile on the screen.
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

    // Get the current user.
    const user = req.user;

    // If the user is the admin, render the event creation page.
    if(req.isAuthenticated() && user.username == ADMIN_NAME) {
        res.render("event_creation", {
            user: req.user
        });
    } else {
        res.redirect("/user_profile");
    }
});

// -------------------------------------- EVENT SECTION (GET) -----------------------------------------------

/* SECTION WITHIN GET: FUNCTIONS FOR SIMPLIFYING THE DATE/TIME DISPLAY OF EVENTS */

// The following function relates to the route, NEW POSTS, created below.
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
    simplifiedDate = month + " " + (day) + ", " + year; // --> ORIGINALLY THIS SAID (day - 1)???
    return simplifiedDate;
}

// The following function relates to the route, NEW POSTS, created below
// it. The function takes the military time that is stored in the database
// and converts it to regular time. This conversion function is called
// in the route below that displays events on the page.
function convertToStandardTime(eventTime){

    // Convert the military time for the parameter passed
    // through the function (start and end times).
    var time = eventTime;

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

// The function is used to convert times into military time.
// This is useful in the case where two times or time ranges
// are compared to determine overlaps.
function convertToMilitaryTime(eventTime) {
 
    // Create variables for storing the data for time conversion.
    var [time, modifier] = eventTime.split(" ");
    let [hours, minutes] = time.split(":");

    // If the hours is equal to 12, set to zero for military time.
    if (hours == "12") {
        hours = "00";
    }

    // If the modifier is PM, add 12 to it in accordance with MT.
    if (modifier == "P.M.") {
        hours = parseInt(hours, 10) + 12;
    }

    // Add the minutes to the hours in decimal form.
    hours = hours + (parseInt(minutes, 10) / 100);

    // Return the converted value.
    // return `${hours}:${minutes}`;
    return hours;
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
            eventTimeIncrements: event.eventTimeIncrements,
            eventLocation: event.eventLocation,
            eventDescription: event.eventDescription,
            numVolunteersNeeded: event.numVolunteersNeeded,
            neededDonations: event.neededDonations,
            successVolunteeredOrDonated: req.flash("successVolunteeredOrDonated"),
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

// Create a post request for when the user clicks
// the link to download the user help manual.
app.post("/download_help", function(req, res){
    res.redirect("/download_help");
});

// Create a post request for when the user wants
// to donate to the organization of Team Aptiv.
app.post("/donate_org", function(req, res){

    // Create variables for updating the total donations for the org.
    const organizationID = req.body.orgidentifier;
    const addedDonation = req.body.orgdonation;

    // Check if the user has an account. Otherwise, redirect to login.
    if(req.isAuthenticated()) {

        // Update the total donations to the organization.
        OrgModel.findOneAndUpdate({orgID: organizationID}, {$inc: {receivedDonations: addedDonation}}, function(err, foundDonation){
            if(!err) {
                req.flash("thanksForDonation", "Thank you for your donation!");
                res.redirect("/about");
            }
        });
    } else {
        res.redirect("/login");
    }
});

// Create a post request for when user clicks the "Register" button.
// This route will determine whether the user registering for an account
// is a regular user or an ADMIN. The route also determines if accounts
// already exist.
app.post("/register", function(req, res){
   
    // Create a new user ID for the developers to use and track. // <-- MAYBE!!!
    var user_ID = mongoose.Types.ObjectId();
    var user_IDString = user_ID.toString();

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
                    status: "Admin",
                    timesAttending: [user_IDString]
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
                    username: req.body.username,
                    timesAttending: [user_IDString]
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

    // Create a new event ID for the developers to use and track.
    // Also create a string version of the event ID to put in the
    // timeslots array. This eliminates the issue of duplicate keys.
    var event_ID = mongoose.Types.ObjectId();
    var event_IDString = event_ID.toString();

    // !!!MAYBE ADD CHECKS AT SOME POINT TO DETERMINE IF AN EVENT WAS ALREADY CREATED

    // STEP 1: Calculate the total duration of a given event.
    // The function takes the time range and returns the total time
    // of any event.
    function diffInTime(start, end) {
        start = start.split(":");
        end = end.split(":");
        var startDate = new Date(0, 0, 0, start[0], start[1], 0);
        var endDate = new Date(0, 0, 0, end[0], end[1], 0);
        var diff = endDate.getTime() - startDate.getTime();
        var hours = Math.floor(diff / 1000 / 60 / 60);
        diff -= hours * 1000 * 60 * 60;
        var minutes = Math.floor(diff / 1000 / 60);
   
        // If using time pickers with 24 hours format, add the below line to get exact hours
        if (hours < 0)
           hours = hours + 24;
   
        return (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;
    }

    // STEP 2: Convert the duration of the given event to minutes.
    // The function takes in the total calculated time from the previous
    // function above as an input and returns the total calculated time as
    // minutes.
    function convertH2M(timeInHour){
        var timeParts = timeInHour.split(":");
        return Number(timeParts[0]) * 60 + Number(timeParts[1]);
    }
   
    // STEP 3: Execute STEP 2 and STEP 3. Find the total duration
    // of the event, and then convert it to minutes. Then divide the
    // calculated total time (in minutes) by the number of volunteers.
    var totalTime = diffInTime(req.body.eventstarttime, req.body.eventendtime);
    var totalTimeMinutes = convertH2M(totalTime);
    var incrementTimeMinutes = totalTimeMinutes / req.body.eventvolunteers;

    // STEP 4: Break the time of the event into increments based on the number of volunteers.
    // The result of the functions above, divided minutes (totalTimeMinutes)
    // parameter), is passed into this function.
    var makeTimeIntervals = function (startTime, endTime, increment) {
       
        // If the increment entered by the admin is zero, return
        // the range as from the start time to the end time.
        if(increment == 0) {

            var range  = [startTime.toString() + " - " + endTime.toString()];
            return range;

        } else {

            startTime = startTime.toString().split(':');
            endTime = endTime.toString().split(':');
            increment = parseInt(increment, 10);
       
            var pad = function (n) { return (n < 10) ? '0' + n.toString() : n; },
                startHr = parseInt(startTime[0], 10),
                startMin = parseInt(startTime[1], 10),
                endHr = parseInt(endTime[0], 10),
                endMin = parseInt(endTime[1], 10),
                currentHr = startHr,
                currentMin = startMin,
                previous = currentHr + ':' + pad(currentMin),
                current = '',
                r = [];
       
            do {
                currentMin += increment;
                if ((currentMin % 60) === 0 || currentMin > 60) {
                    currentMin = (currentMin === 60) ? 0 : currentMin - 60;
                    currentHr += 1;
                }
                current = currentHr + ':' + pad(currentMin);
                r.push(previous + ' - ' + current);
                previous = current;
            } while (currentHr !== endHr);
           
                return r;
        }
    };

    // STEP 5: Call the function right above to generate the different time intervals of the event.
    var volunteerTimeIncrements = makeTimeIntervals(req.body.eventstarttime, req.body.eventendtime, incrementTimeMinutes);

    // STEP 6: Loop through the array and convert the military times to standard times.
    var convertVolunteerTimeIncrements = [];
    convertVolunteerTimeIncrements.push(event_IDString);

    let i = 0;
    for (i = 0; i < volunteerTimeIncrements.length; i++) {

        // Convert the time ranges to standard time.  
        var splitStartAndEnd = volunteerTimeIncrements[i].split(' - ');
        var convertStart = convertToStandardTime(splitStartAndEnd[0]);
        var convertEnd = convertToStandardTime(splitStartAndEnd[1])
        var newConvertedTimeRange = convertStart + ' - ' + convertEnd;
        convertVolunteerTimeIncrements.push(event_IDString + " " + newConvertedTimeRange);
    }

    // STEP 7: Add the ID of the event to the description
    // to avoid the duplicate key error. Also add the content
    // (or lack thereof) to the event description.
    var description = event_IDString + " " + req.body.eventdescription;

    // STEP 8: Create a new event based on the event schema.
    // Pass in the different time slots as an array for the
    // 'eventTimeIncrements' attribute.
    const newEvent = new EventModel({
        eventID: event_ID,
        eventName: req.body.eventname,
        eventDate: req.body.eventdate,
        eventStartTime: req.body.eventstarttime,
        eventEndTime: req.body.eventendtime,
        eventTimeIncrements: convertVolunteerTimeIncrements,
        eventLocation: req.body.eventlocation,
        eventDescription: description,
        numVolunteersNeeded: req.body.eventvolunteers,
        neededDonations: req.body.eventdonations,
    });

    // STEP 9: Save the new event created
    // by the ADMIN to the database.
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


// ---------------------------------- USER EVENT CANCELLATION (POST) -------------------------------------------


// Create a post request for the user to volunteer for an event.
app.post("/cancel_event", function(req, res){

    // Obtain the specific event id from the webpage 
    // when the user clicks on the 'cancel-time(s)' button.
    const requestedEventId = req.body.eventidentifier;

    // Create a variable to act as a counter. If the counter 
    // ends up being a certain value, remove the actual event 
    // from the user's profile.
    var numberOfUserTimeslots = req.body.timeattendlength;

    // First check if the user is authenticated in the case that
    // a user attempts to manually type in this route.
    if(req.isAuthenticated()) {

        // Create variables for the checkbox(s) or timeslot(s) to be cancelled.
        // Also obtain the event identifier for the particular event in which the
        // timeslot(s) are being removed from.
        var atLeastOneTime = req.body.timeattending;

        // Create a variable for the event object itself in order to 
        // remove the actual event object if neccessary.
        var eventObject = req.body.eventidentifier;
        
        // First check and see if the user selected at least 
        // one checkbox. If the user did not select any
        // checkboxes, reroute them back to the user_profile page.
        if(atLeastOneTime == undefined) {

            req.flash("permissionDenied", "Please select at least one checkbox");
            res.redirect("/user_profile");
            return;

        } else {
            
            // Create variables to help add the event 
            // to the user collection in the database.
            var user = req.user;

             // First find the user who wants to volunteer for a particular event.
             UserModel.findById(user._id, function(err, userInfo) {
                
                // If there is an error, log the error. Otherwise, perform validation.
                if(err) {
                    console.log(err);
                } else {

                    // ------------------- CANCEL Times User Wants to Get Rid Of -------------------
                    // Check whether the user selected one or multiple timeslots to remove.
                    if(Array.isArray(atLeastOneTime) == true) {
                        
                        // ------------------- MULTIPLE Timeslots Selected -------------------
                        // Go thorugh each timeslot that was selected by the user
                        // to be cancelled, and remove it from the user profile
                        // while also updating the other event information.
                        atLeastOneTime.forEach(function(timeSlot) {

                            //console.log(timeSlot);
                            // Create variables for simplifying the event time slot
                            // when it is added back to the different data components.
                            var timeSlotSplit = timeSlot.split(" ");
                            var simplifiedTimeSlot = timeSlotSplit[3] + " " + timeSlotSplit[4] + " " + timeSlotSplit[5] + " " + timeSlotSplit[6] + " " + timeSlotSplit[7] + " " + timeSlotSplit[8];

                            // Remove the timelot from the user's database.
                            UserModel.findOneAndUpdate(
                                { _id: user.id },
                                { $pull: { timesAttending: timeSlot } },                   
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("User Success: " + success);
                                    }
                                }
                            );

                            // Add the timeslot that the user cancelled back 
                            // to the event database that it belongs to.
                            EventModel.findOneAndUpdate(
                                { _id: requestedEventId },
                                { $push: { eventTimeIncrements: simplifiedTimeSlot } },                   
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("User Success!!! " + timeSlot); 
                                    }
                                }
                            );

                            // Increment the number of volunteers needed for 
                            // the event after the user cancels their timeslot.
                            EventModel.findOneAndUpdate(
                                { _id: requestedEventId }, 
                                { $inc: { numVolunteersNeeded: 1 } },
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("Success: " + success);
                                    }
                                }
                            );

                            // Decrement the number of timeslots variable to determine
                            // if there are still some left in the user's profile.
                            numberOfUserTimeslots -= 1;

                            // After removing the timeslot from the user's profile,
                            // check if there are any timeslots remaining.
                            if(numberOfUserTimeslots <= 0) {
                                
                                // Remove the timelot from the user's database.
                                UserModel.findOneAndUpdate(
                                    { _id: user.id },
                                    { $pull: { userEvents: eventObject } },                   
                                    function (error, success) {
                                        if (error) {
                                            console.log("Error: " + error);
                                        } else {
                                            // console.log("User Success: " + success);
                                        }
                                    }
                                );
                            }
                        });

                    } else {

                        // ------------------- SINGLE Timeslot Selected -------------------
                        // Create variables for simplifying the event time slot
                        // when it is added back to the different data components.
                        var atLeastOneTimeSplit = atLeastOneTime.split(" ");
                        var simplifiedTimeSlot = atLeastOneTimeSplit[3] + " " + atLeastOneTimeSplit[4] + " " + atLeastOneTimeSplit[5] + " " + atLeastOneTimeSplit[6] + " " + atLeastOneTimeSplit[7] + " " + atLeastOneTimeSplit[8];
                        
                        // Remove the timelot from the user's database.
                        UserModel.findOneAndUpdate(
                            { _id: user.id },
                            { $pull: { timesAttending: atLeastOneTime } },                 
                            function (error, success) {
                                if (error) {
                                    console.log("Error: " + error);
                                } else {
                                    // console.log("User Success: " + success);
                                }
                            }
                        );

                        // Add the timeslot that the user cancelled back 
                        // to the event database that it belongs to.
                        EventModel.findOneAndUpdate(
                            { _id: requestedEventId },
                            { $push: { eventTimeIncrements: simplifiedTimeSlot } },                   
                            function (error, success) {
                                if (error) {
                                    console.log("Error: " + error);
                                } else {
                                    // console.log("User Success!!! " + atLeastOneTime); 
                                }
                            }
                        );

                        // Increment the number of volunteers needed for 
                        // the event after the user cancels their timeslot.
                        EventModel.findOneAndUpdate(
                            { _id: requestedEventId }, 
                            { $inc: { numVolunteersNeeded: 1 } },
                            function (error, success) {
                                if (error) {
                                    console.log("Error: " + error);
                                } else {
                                    // console.log("Success: " + success);
                                }
                            }
                        );

                        // Decrement the number of timeslots variable to determine
                        // if there are still some left in the user's profile.
                        numberOfUserTimeslots -= 1;

                        // After removing the timeslot from the user's profile,
                        // check if there are any timeslots remaining.
                        if(numberOfUserTimeslots == 0) { 
                            
                            // Remove the timelot from the user's database.
                            UserModel.findOneAndUpdate(
                                { _id: user.id },
                                { $pull: { userEvents: eventObject } },                   
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("User Success: " + success);
                                    }
                                }
                            );
                        }
                    }
        
                    // DELETE LATER --> KEEP FOR NOW.
                    // // Create a flash message informing the user 
                    // // that they have cancelled an event timeslot.
                    // req.flash("sucessCancelled", "You have cancelled your time(s)");
    
                    // // Redirect to the user's profile page of the website.
                    // res.redirect("user_profile");
                }
            });

            // Create a flash message informing the user 
            // that they have cancelled an event timeslot.
            req.flash("sucessCancelled", "You have cancelled your time(s)");

            // Redirect to the user's profile page of the website.
            res.redirect("user_profile");
        }

    } else {
        req.flash("permissionDenied", "You need an account to complete this action.");
        res.redirect("/login");
    }
});

// ---------------------------------- USER VOLUNTEER SIGN-UP (POST) -------------------------------------------

// Create a post request for the user to volunteer for an event.
app.post("/volunteer", function(req, res){

    // Obtain the specific event id from the webpage 
    // when the user clicks on the 'sign-up' button.
    const requestedEventId = req.body.eventidentifier;

    // Check if the user is authenticated. If user is authenticated, display a
    // confirmation message and add the event to the user's list of events.
    if(req.isAuthenticated()) {

        // Create a variable for the checkbox(s) or timeslot(s)
        // that the user selected.
        var atLeastOneBox = req.body.timeslot;
        var eventDate = req.body.eventdate;

        // First check and see if the user selected at
        // least one checkbox. If the user did not select
        // any checkboxes, reroute them back to the specific_event
        // route and give them an alert message.
        if(atLeastOneBox == undefined) {

            req.flash("alreadyVolunteered", "Please select at least one checkbox");
            res.redirect("/events/" + requestedEventId);
            return;

        } else {

            // Create variables to help add the event
            // to the user collection in the database.
            var user = req.user;

            // Create variables for adding the event to the
            // user timeslots.
            var listOfUserEvents = user.userEvents;

            // ------------------- Check if times conflict when the user signs up for events -------------------

            // Create a boolean to determine if there is an event conflict or not.
            var eventConflicts = false;

            // First find the user who wants to volunteer for a particular event.
            UserModel.findById(user._id, function(err, userInfo) {
               
                // If there is an error, log the error. Otherwise, perform validation.
                if(err) {
                    console.log(err);
                } else {

                    // Create a function that is used later on to check if any of the times overlap.
                    function checkTimeOverlap(startTime1, endTime1, startTime2, endTime2) {
                        return ((startTime1) <= (endTime2) && (startTime2) < (endTime1) ? true : false);
                    }

                    // If the user selected multiple time slots, execute accordingly.
                    // Otherwise, execute the code that handles a single event sign-up.
                    if(Array.isArray(atLeastOneBox) == true) {
                       
                        // ------------------- Check if times conflict when the user signs up for MULTIPLE time slots -------------------

                        // Go through the array of checkboxes that the user selected  
                        // and compare them with the users current times.
                        loop1:
                        for(let i = 0; i < atLeastOneBox.length; i++) {

                            // Format the date the user is signing up for to compare
                            // it to the other times that exist in the user's profile.
                            var atLeastOneBoxSplit = atLeastOneBox[i].split(" ");
                            var timeSignedUpFor = atLeastOneBoxSplit[1] + " " + atLeastOneBoxSplit[2] + " " + atLeastOneBoxSplit[3] + " " + atLeastOneBoxSplit[4] + " " + atLeastOneBoxSplit[5];
                       
                            // If there are no errors, loop through all of the  
                            // event times that the user is already attending.
                            loop2:
                            for(let i = 1; i < userInfo.timesAttending.length; i++) {

                                // Use the split function to extract the neccessary components
                                // that you will use to make comparisons and check for conflicts.
                                var userInfoSplit = userInfo.timesAttending[i].split(" ");
                                var userInfoDate = userInfoSplit[0] + " " + userInfoSplit[1] + " " + userInfoSplit[2];
                                var userInfoTime = userInfoSplit[4] + " " + userInfoSplit[5] + " " + userInfoSplit[6] + " " + userInfoSplit[7] + " " + userInfoSplit[8];

                                // --> The code below relates to converting the standard time
                                // --> to military time in order to determine time overlaps.

                                // First convert the user time range into start and end times.
                                var userInfoTimeArray = userInfoTime.split(" - ");
                                var userInfoTimeStart = convertToMilitaryTime(userInfoTimeArray[0]);
                                var userInfoTimeEnd = convertToMilitaryTime(userInfoTimeArray[1]);

                                // Next convert the time(s) signed up for into start and end times.
                                var timeSignedUpForArray = timeSignedUpFor.split(" - ");
                                var timeSignedUpForStart = convertToMilitaryTime(timeSignedUpForArray[0]);
                                var timeSignedUpForEnd = convertToMilitaryTime(timeSignedUpForArray[1]);

                                // Check if any of the times in the user database match the
                                // time that the user wants to sign up for. This involves
                                // checking the date of the event as well.
                                if((userInfoDate == eventDate && userInfoTime == timeSignedUpFor) || (checkTimeOverlap(userInfoTimeStart, userInfoTimeEnd, timeSignedUpForStart, timeSignedUpForEnd) == true)) {
                                    eventConflicts = true;
                                    break loop1;
                                }
                            }
                        }

                    } else {

                        // ------------------- Check if times conflict when the user signs up for a SINGLE time slot -------------------

                        // Format the date the user is signing up for to compare
                        // it to the other times that exist in the user's profile.
                        var atLeastOneBoxSplit = atLeastOneBox.split(" ");
                        var timeSignedUpFor = atLeastOneBoxSplit[1] + " " + atLeastOneBoxSplit[2] + " " + atLeastOneBoxSplit[3] + " " + atLeastOneBoxSplit[4] + " " + atLeastOneBoxSplit[5];

                        // If there are no errors, loop through all of the  
                        // event times that the user is already attending.
                        for(let i = 1; i < userInfo.timesAttending.length; i++) {

                            // Use the split function to extract the neccessary components
                            // that you will use to make comparisons and check for conflicts.
                            var userInfoSplit = userInfo.timesAttending[i].split(" ");
                            var userInfoDate = userInfoSplit[0] + " " + userInfoSplit[1] + " " + userInfoSplit[2];
                            var userInfoTime = userInfoSplit[4] + " " + userInfoSplit[5] + " " + userInfoSplit[6] + " " + userInfoSplit[7] + " " + userInfoSplit[8];

                            // --> The code below relates to converting the standard time
                            // --> to military time in order to determine time overlaps.

                            // First convert the user time range into start and end times.
                            var userInfoTimeArray = userInfoTime.split(" - ");
                            var userInfoTimeStart = convertToMilitaryTime(userInfoTimeArray[0]);
                            var userInfoTimeEnd = convertToMilitaryTime(userInfoTimeArray[1]);

                            // Next convert the time(s) signed up for into start and end times.
                            var timeSignedUpForArray = timeSignedUpFor.split(" - ");
                            var timeSignedUpForStart = convertToMilitaryTime(timeSignedUpForArray[0]);
                            var timeSignedUpForEnd = convertToMilitaryTime(timeSignedUpForArray[1]);

                            // Check if any of the times in the user database match the
                            // time that the user wants to sign up for. This involves
                            // checking the date of the event as well.
                            if((userInfoDate == eventDate && userInfoTime == timeSignedUpFor) || (checkTimeOverlap(userInfoTimeStart, userInfoTimeEnd, timeSignedUpForStart, timeSignedUpForEnd) == true)) {
                                eventConflicts = true;
                                break;
                            }
                        }
                    }

                    // ------------------- INCORPORATE Times User Signed Up For -------------------
       
                    // If there are no event conflicts, check if the event object itself has
                    // already been added to the user's events attribute. This is for the
                    // case when the user signs up for a timeslot or timeslots for the very
                    // first time.
                    if(eventConflicts == false) {
       
                        // Create a variable to represent whether the user
                        // has already signed up for the event or not.
                        var alreadyAdded = false;
       
                        // Go through the list of events in the user events attribute
                        // and check if the event is already in the user db.
                        listOfUserEvents.forEach(function(eventInUserProfile) {
       
                            // Check if the event already exists in the user's events section.
                            if(String(eventInUserProfile) == String(requestedEventId)) {
                                alreadyAdded = true;
                            }
                        });
       
                        // If the event object itself has NOT already been added, add it.
                        if(alreadyAdded == false) {
                            // Add the event to the user's profile so that you can list
                            // the event that the user volunteered for in their profile.
                            UserModel.findOneAndUpdate(
                                { _id: user.id },
                                { $push: { userEvents: requestedEventId } },
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        //console.log("Success: " + success);
                                    }
                                }
                            );
                        }
       
                        // TIMESLOT SECTION: Check if the user selected more than one timeslot.
                        // Otherwise, only add the single timeslot that the user selected.
                        if(Array.isArray(atLeastOneBox) == true) {
       
                            // ------------------- MULTIPLE Timeslots Selected -------------------
                            // Use a for each loop to add multiple timeslots to the user DB.
                            atLeastOneBox.forEach(function(timeSlot) {
       
                                // Decrement the number of volunteers needed for
                                // the event.
                                EventModel.findOneAndUpdate(
                                    { _id: requestedEventId },
                                    { $inc: { numVolunteersNeeded: -1 } },
                                    function (error, success) {
                                        if (error) {
                                            console.log("Error: " + error);
                                        } else {
                                            // console.log("Success: " + success);
                                        }
                                    }
                                );
       
                                // Increment the number of volunteers that are
                                // currently attending the event.
                                EventModel.findOneAndUpdate(
                                    { _id: requestedEventId },
                                    { $inc: { numVolunteers: 1 } },
                                    function (error, success) {
                                        if (error) {
                                            console.log("Error: " + error);
                                        } else {
                                            // console.log("Success: " + success);
                                        }
                                    }
                                );
       
                                // Remove the time that the user selected
                                // from the given event database.
                                EventModel.findOneAndUpdate(
                                    { _id: requestedEventId },
                                    { $pull: { eventTimeIncrements: timeSlot } },                  
                                    function (error, success) {
                                        if (error) {
                                            console.log("Error: " + error);
                                        } else {
                                            // console.log("Success: " + success);
                                        }
                                    }
                                );
       
                                // Add the time that the user selected to the
                                // user's event time database.
                                UserModel.findOneAndUpdate(
                                    { _id: user.id },
                                    { $push: { timesAttending: eventDate + " " + timeSlot } },                  
                                    function (error, success) {
                                        if (error) {
                                            console.log("Error: " + error);
                                        } else {
                                            // console.log("User Success: " + success);
                                        }
                                    }
                                );
                            });
                        } else {
       
                            // ------------------- SINGLE Timeslot Selected -------------------
                            // Decrement the number of volunteers needed for
                            // the event.
                            EventModel.findOneAndUpdate(
                                { _id: requestedEventId },
                                { $inc: { numVolunteersNeeded: -1 } },
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("Success: " + success);
                                    }
                                }
                            );
       
                            // Increment the number of volunteers that are
                            // currently attending the event.
                            EventModel.findOneAndUpdate(
                                { _id: requestedEventId },
                                { $inc: { numVolunteers: 1 } },
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("Success: " + success);
                                    }
                                }
                            );
       
                            // Remove the time that the user selected
                            // from the given event database.
                            EventModel.findOneAndUpdate(
                                { _id: requestedEventId },
                                { $pull: { eventTimeIncrements: atLeastOneBox } },                  
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("Success: " + success);
                                    }
                                }
                            );
       
                            // Add the time that the user selected to the
                            // user's event time database.
                            UserModel.findOneAndUpdate(
                                { _id: user.id },
                                { $push: { timesAttending: eventDate + " " +atLeastOneBox } },                  
                                function (error, success) {
                                    if (error) {
                                        console.log("Error: " + error);
                                    } else {
                                        // console.log("User Success: " + success);
                                    }
                                }
                            );
                        }
       
                        // Create a flash message informing the user
                        // that they have signed up for an event.
                        req.flash("successVolunteeredOrDonated", "You have signed up for the event timeslot(s)");
       
                        // Redirect to the specific event page of the website.
                        res.redirect("/events/" + requestedEventId);
       
                    } else {
                        // Create a flash message for the specific event page informing
                        // the user that they already signed up for the event.
                        req.flash("alreadyVolunteered", "Cannot sign up. You have a time conflict with another event.");
                        res.redirect("/events/" + requestedEventId);
                    }
                }
            });
        }

    } else {
        req.flash("permissionDenied", "You need an account to volunteer.");
        res.redirect("/login");
    }
});

// Create a post request for when user clicks the "Find Events" button.
app.post("/find_events", function(req, res){
    res.redirect("/events");
});

// ---------------------------------- USER DONATION (POST) -------------------------------------------

// Create a route for when the user wants to volunteer for a particular event.
app.post("/donate", function(req, res){

    // Obtain the specific event id from the webpage
    // when the user clicks on the 'donate' button.
    const requestedEventId = req.body.eventidentifier;

    // Check if the user is authenticated. If user is authenticated, display a
    // confirmation message and add the event to the user's list of events.
    if(req.isAuthenticated()) {

        // Create variables to help add the event
        // to the user collection in the database.
        var user = req.user;
        var listOfUserEvents = user.userEvents;
        var userStatus = user.status;

        // Check if the user already has the status of "Volunteer and Donor".
        // If not, then make the user have the status of "Volunteer and Donor".
        if(userStatus == "Volunteer") {

            // Set the status of the user to "Volunteer and Donor".
            UserModel.findOneAndUpdate(
                { _id: user.id },
                { $set: { status: "Volunteer, Donor" } },
                function (error, success) {
                    if (error) {
                        console.log("Error: " + error);
                    } else {
                        //console.log("Success: " + success);
                    }
                }
            );
        }

        // Create a variable to represent whether the user
        // has already had the event added to their profile or not.
        var alreadyAdded = false;

        // Go through the list of events in the user events attribute
        // and check if the event is already in the user db.
        listOfUserEvents.forEach(function(eventInUserProfile) {

            // Check if the event already exists in the user's events section.
            if(String(eventInUserProfile) == String(requestedEventId)) {
                alreadyAdded = true;
            }
        });

        // If the user has NOT already been added, add the user.
        if(alreadyAdded == false) {
            // Add the event to the user's profile so that you can list
            // the event that the user volunteered for in their profile.
            UserModel.findOneAndUpdate(
                { _id: user.id },
                { $push: { userEvents: requestedEventId } },
                function (error, success) {
                    if (error) {
                        console.log("Error: " + error);
                    } else {
                        //console.log("Success: " + success);
                    }
                }
            );
        }

        // Decrement the number of donations needed for
        // the event.
        EventModel.findOneAndUpdate(
            { _id: requestedEventId },
            { $inc: { neededDonations: -(req.body.eventdonation) } },
            function (error, success) {
                if (error) {
                    console.log("Error: " + error);
                } else {
                    // console.log("Success: " + success);
                }
            }
        );

        // Increment the number of donations that
        // have been given to the event.
        EventModel.findOneAndUpdate(
            { _id: requestedEventId },
            { $inc: { numDonations: req.body.eventdonation } },
            function (error, success) {
                if (error) {
                    console.log("Error: " + error);
                } else {
                    // console.log("Success: " + success);
                }
            }
        );

        // Create a flash message informing the user
        // that they have donated to an event.
        req.flash("successVolunteeredOrDonated", "Thank you for your donation");

        // Redirect to the specific event page of the website.
        res.redirect("/events/" + requestedEventId);

    } else {
        req.flash("permissionDenied", "You need an account to volunteer or donate.");
        res.redirect("/login");
    }
});


// ============================================================================================================


/* SECTION: LISTEN FOR SERVER REQUESTS */

// Begin listening for server requests on port 3000.
app.listen(3000, function(){
    console.log("Server for Aptiv Web App started on port 3000.");
});