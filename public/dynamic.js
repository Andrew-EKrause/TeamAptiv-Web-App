/*
 * Author: Riley Radle
 * Description: 
 *      This file handles the dynamic styling of the website
 *      which requires javascript to perform.
 * 
 * Last Edited: December 2021
 * 
 */


/*
 * This function controls the navbar in the 
 * user and admin profile.  It hides and shows
 * information depending on which button was clicked
 * 
 * It also handles changing some basic settings
 */
document.addEventListener('click', e => {
    const src = e.target.parentElement;
    const srcClass = src.className;

    if (srcClass != '') {
        // Get the events and settings elements
        let events = document.getElementById('events-list');
        let settings = document.getElementById('settings');
        let users = document.getElementById('users-list');
        let cancelled = document.getElementById('cancelledevent-list');

        // Set the attirbutes of these elements
        if (srcClass == 'events-toggler') {
            // Set the attribute of this one to be shown
            events.setAttribute("data-visible", true);
            settings.setAttribute("data-visible", false);
            users.setAttribute("data-visible", false);
            cancelled.setAttribute("data-visible", false);
        } 
        else if (srcClass == 'settings-toggler') {

            // Set the current settings
            settingsSetup();

            settings.setAttribute("data-visible", true);
            events.setAttribute("data-visible", false);
            users.setAttribute("data-visible", false);
            cancelled.setAttribute("data-visible", false);
        }
        else if (srcClass == 'users-toggler') {
            users.setAttribute("data-visible", true);
            events.setAttribute("data-visible", false);
            settings.setAttribute("data-visible", false);
            cancelled.setAttribute("data-visible", false);
        }
        else if (srcClass == 'cancelledevent-toggler') {
            cancelled.setAttribute("data-visible", true);
            users.setAttribute("data-visible", false);
            events.setAttribute("data-visible", false);
            settings.setAttribute("data-visible", false);
        }
    }
});

/* ========== Handle changing the settings ========== */

// Set defaults for the values
const defaultTheme = "#EB8B32";
const defaultForegroundColor = "#1F1F1F";
const defaultBackgroundPrimary = "#F0F0F0";
const defaultBackgroundSecondary = "#FFFFFF";
const defaultFontSize = "1rem";

// Use later when doing dark theme
const rootProperties = [
    "--foreground-color", "--background-primary", 
    "background-secondary", "--theme1", "font-size"
];

/* 
 *  This function changes the settings when the user 
 *  submits a form. Called on submission of a form 
 */
function changeSettings() {
    let selectedColor = document.getElementById("accent-color").value;
    let selectedFontSize = document.getElementById("font-size").value;
    sessionStorage.setItem("--theme1", selectedColor);
    sessionStorage.setItem("font-size", selectedFontSize);
}

/*
 * This function assigns the setting elements to have 
 * the currently selected settings when they view them.
 */
function settingsSetup() {
    let color = document.documentElement.style.getPropertyValue("--theme1");
    let fontSize = document.documentElement.style.getPropertyValue("font-size");

    // If there is no current color or font size, set to default
    if (color == "") {
        document.documentElement.style.setProperty("--theme1", defaultTheme);
    }
    if (fontSize == "") {
        document.documentElement.style.setProperty("font-size", defaultFontSize);
    }

    // Set the current settings to be the value of the form elements in settings
    document.getElementById("accent-color").setAttribute("value",
        document.documentElement.style.getPropertyValue("--theme1"));

    // Determine which value of the dropdown is already selected
    let selectFontSize = document.getElementById("font-size");
    let currentFontSize = document.documentElement.style.getPropertyValue("font-size");

    let parent = document.getElementById("font-size");
    let temp = parent.firstElementChild;

    while (temp != null) {
        if(temp.getAttribute("value") == currentFontSize)
            temp.setAttribute("selected", "selected");
        else 
            temp.removeAttribute("selected");
        temp = temp.nextElementSibling;
    }
}

/*
 * This function loads the saved settings every time a page is loaded.
 * Setting data is stored in the session rather than database for simplicity.
 */
const loadSavedSettings =  function() {
    // Use later when doing dark theme
    // for (property in rootProperties) {
    //     document.documentElement.style.setProperty(
    //         property, sessionStorage.getItem(property)
    //     );
    // }
    let userTheme = sessionStorage.getItem("--theme1");
    let userFontSize = sessionStorage.getItem("font-size");

    // If they have not set anything yet, set the defaults
    if (userTheme == null) {
        userTheme = defaultTheme;
        sessionStorage.setItem("--theme1", defaultTheme);
    }
    if (userFontSize == null) {
        userFontSize = defaultFontSize;
        sessionStorage.setItem("font-size", defaultFontSize);
    }

    // Apply the styles
    document.documentElement.style.setProperty("--theme1", userTheme);
    document.documentElement.style.setProperty("font-size", userFontSize);
}

// Load the user's settings every time that the page is loaded
window.addEventListener("load", loadSavedSettings, false);
