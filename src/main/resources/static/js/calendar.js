document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: getEvents(),
        eventClick: function(info) {
            alert(`Total spent on ${info.event.start.toDateString()}: ${info.event.title}`);
        }
    });
    calendar.render();
});

function getEvents() {
    const totalHistory = JSON.parse(localStorage.getItem('totalHistory')) || [];
    console.log("Total History:", totalHistory); // Debugging line
    const events = [];
    const dailyTotals = {};

    totalHistory.forEach(entry => {
        const date = entry.date;
        const total = parseFloat(entry.total);

        if (date && !isNaN(total)) {
            if (!dailyTotals[date]) {
                dailyTotals[date] = 0;
            }
            dailyTotals[date] += total;
        }
    });

    for (const [date, total] of Object.entries(dailyTotals)) {
        events.push({
            title: `$${total.toFixed(2)}`,
            start: date,
            allDay: true
        });
    }

    console.log("Generated Events:", events); // Debugging line
    return events;
}

// Utility function to check if a string is a valid date
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}
