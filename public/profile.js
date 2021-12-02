/*
 * This function controls the navbar in the 
 * user and admin profile.  It hides and shows
 * information depending on which button was clicked
 */
document.addEventListener('click', e => {
    const src = e.target.parentElement;
    const srcClass = src.className;

    if (srcClass != '') {
        // Get the events and settings elements
        let events = document.getElementById('events-list');
        let settings = document.getElementById('settings');
        let users = document.getElementById('users-list');

        // Set the attirbutes of these elements
        if (srcClass == 'events-toggler') {
            // Set the attribute of this one to be shown
            events.setAttribute("data-visible", true);
            settings.setAttribute("data-visible", false);
            users.setAttribute("data-visible", false);
        } 
        else if (srcClass == 'settings-toggler') {
            settings.setAttribute("data-visible", true);
            events.setAttribute("data-visible", false);
            users.setAttribute("data-visible", false);
        }
        else if (srcClass == 'users-toggler') {
            users.setAttribute("data-visible", true);
            events.setAttribute("data-visible", false);
            settings.setAttribute("data-visible", false);
        }
    }
});