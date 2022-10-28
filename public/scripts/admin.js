let button = document.getElementById('btn_history')
let historyContainer = document.getElementById('all_users_history')
let eventList = []

button.addEventListener("click", async (event) => {
    event.preventDefault()

    let selectedUser = document.getElementById('user_selection').value
    if (selectedUser == "") {
        // Selection empty -> Show history for all users
        console.log('Showing history for all users')
        /*
        * // Get events from database, push into empty eventList
        * eventList = []
        * historyContainer.innerHTML = `<b> History of all users:</b>`
        *
        * let eventsFromDB = getAllEvents from database
        * for await (let event of eventsFromDB) {
        *       eventList.push(event);
        * }
        *
        * // Fill container with events
        * eventList.forEach(event => {
        *       historyContainer.innerHTLM += `<li>${event}</li>`
        * }
        */
    } else {
        // Show history for selected user
        console.log('Showing history for ' + selectedUser)
        /*
        * // Get events from database, push into empty eventList
        * eventList = []
        * historyContainer.innerHTML = `<b> History of ${selectedUser}:</b>`
        *
        * let eventsFromDB = getUserEvents from database
        * for await (let event of eventsFromDB) {
        *       eventList.push(event)
        * }
        *
        * // Fill container with events
        * eventList.forEach(event => {
        *       historyContainer.innerHTML += `<li>${event}</li>`
        * }
        * */
    }
})
