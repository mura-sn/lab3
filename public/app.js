//Makes the webpage interactive and communicates with the backend
/* DOM ELEMENTS */
// Get references to all important HTML elements
const tablesList = document.getElementById('tables-list');
const reservationsList = document.getElementById('reservations-list');
const reservationForm = document.getElementById('reservation-form');
const reservationMessage = document.getElementById('reservation-message');
const reservationIdInput = document.getElementById('reservation-id');
const cancelEditBtn = document.getElementById('cancel-edit');
const submitBtn = document.getElementById('submit-btn');
const timeInput = document.getElementById('reservation-time');
const tableNumberSelect = document.getElementById('table-number');
const guestCountSelect = document.getElementById('guest-count');

//The frontend (app.js) uses the Fetch API to make HTTP requests to our Express backend endpoints
// (GET, POST, PUT, DELETE) and exchanges JSON data.
/* INITIALIZE APP */
// When page loads, fetch data and setup form
document.addEventListener('DOMContentLoaded', () => {
    fetchTables();
    fetchReservations();
    populateTableDropdown();
    
    // Set minimum datetime to current time
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - timezoneOffset).toISOString().slice(0, 16);
    timeInput.min = localISOTime;
});

/* TABLE DROPDOWN MANAGEMENT */
// Populate table dropdown with available tables
async function populateTableDropdown(currentReservationId = null) {
    try {
        // Include current reservation table if editing
        const url = currentReservationId 
            ? `http://localhost:3000/available-tables?currentReservation=${currentReservationId}`
            : 'http://localhost:3000/available-tables';
        
        const response = await fetch(url);
        const tables = await response.json();
        
        // Clear existing options (keep first empty option)
        while (tableNumberSelect.options.length > 1) {
            tableNumberSelect.remove(1);
        }
        
        // Add table options to dropdown
        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = `Table ${table.id} (${table.seats} seats)`;
            // Disable unavailable tables (except current reservation) kanang na reserve na
            if (!table.available && table.id !== currentReservationId) {
                option.disabled = true;
            }
            tableNumberSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

/* DATA FETCHING FUNCTIONS */

// Get available tables and display them
async function fetchTables() {
    try {
        const response = await fetch('http://localhost:3000/tables');
        const tables = await response.json();
        
        // Generate HTML table to display available tables
        let html = `<table><tr><th>Table #</th><th>Seats</th></tr>`;
        
        tables.forEach(table => {
            html += `<tr><td>${table.id}</td><td>${table.seats}</td></tr>`;
        });
        
        html += '</table>';
        tablesList.innerHTML = tables.length ? html : '<p>No tables available</p>';
    } catch (error) {
        showMessage('error', 'Failed to load tables');
    }
}

// Get all reservations and display them
async function fetchReservations() {
    try {
        const response = await fetch('http://localhost:3000/reservations');
        const reservations = await response.json();
        
        if (reservations.length === 0) {
            reservationsList.innerHTML = '<p>No reservations found</p>';
            return;
        }
        
        // Generate HTML table of reservations
        let html = `
            <table>
                <tr>
                    <th>ID</th><th>Table #</th><th>Name</th>
                    <th>Time</th><th>Guests</th><th>Actions</th>
                </tr>
        `;
        
        reservations.forEach(reservation => {
            const date = new Date(reservation.time);
            const formattedTime = date.toLocaleString();
            
            html += `
                <tr>
                    <td>${reservation.id}</td>
                    <td>${reservation.tableNumber}</td>
                    <td>${reservation.customerName}</td>
                    <td>${formattedTime}</td>
                    <td>${reservation.guests}</td>
                    <td>
                        <button onclick="editReservation(${reservation.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="cancelReservation(${reservation.id})">
                            <i class="fas fa-trash"></i> Cancel
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</table>';
        reservationsList.innerHTML = html;
    } catch (error) {
        showMessage('error', 'Failed to load reservations');
    }
}

/* FORM HANDLING */

// Handle form submission (create/update reservation)
reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const id = reservationIdInput.value ? parseInt(reservationIdInput.value) : null;
    const tableNumber = parseInt(tableNumberSelect.value);
    const customerName = document.getElementById('customer-name').value;
    const time = timeInput.value;
    const guests = parseInt(guestCountSelect.value);
    
    try {
        /* CLIENT-SIDE VALIDATION */
        const now = new Date();
        const selectedDate = new Date(time);
        if (selectedDate <= now) {
            throw new Error("Reservation time must be in the future");
        }
        
        if (!tableNumber) {
            throw new Error("Please select a table");
        }
        
        if (!guests) {
            throw new Error("Please select number of guests");
        }
        
        // Send data to server
        const response = await fetch('http://localhost:3000/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tableNumber, customerName, time, guests })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || "Failed to save reservation");
        }
        
        // Success - update UI
        showMessage('success', result.message);
        resetForm();
        fetchTables();
        fetchReservations();
        populateTableDropdown();
    } catch (error) {
        showMessage('error', error.message);
    }
});

// Edit reservation - load data into form
async function editReservation(id) {
    try {
        const response = await fetch('http://localhost:3000/reservations');
        const reservations = await response.json();
        const reservation = reservations.find(r => r.id === id);
        
        if (!reservation) {
            throw new Error("Reservation not found");
        }
        
        // Fill form with reservation data
        reservationIdInput.value = reservation.id;
        
        // Load tables dropdown including current table
        await populateTableDropdown(reservation.tableNumber);
        
        // Set form values
        tableNumberSelect.value = reservation.tableNumber;
        document.getElementById('customer-name').value = reservation.customerName;
        
        // Convert time to local format
        const date = new Date(reservation.time);
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date - timezoneOffset).toISOString().slice(0, 16);
        timeInput.value = localISOTime;
        
        guestCountSelect.value = reservation.guests;
        
        // Update UI for edit mode
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Reservation';
        cancelEditBtn.style.display = 'block';
    } catch (error) {
        showMessage('error', error.message);
    }
}

// Cancel edit mode - reset form
cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
    reservationForm.reset();
    reservationIdInput.value = '';
    submitBtn.innerHTML = '<i class="fas fa-bookmark"></i> Create Reservation';
    cancelEditBtn.style.display = 'none';
    
    // Reset time input to current time
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - timezoneOffset).toISOString().slice(0, 16);
    timeInput.min = localISOTime;
    
    // Refresh table dropdown
    populateTableDropdown();
}

// Cancel reservation
async function cancelReservation(id) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/reservations/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || "Failed to cancel reservation");
        }
        
        showMessage('success', result.message);
        fetchTables();
        fetchReservations();
        populateTableDropdown();
    } catch (error) {
        showMessage('error', error.message);
    }
}

/* UTILITY FUNCTIONS */

// Show success/error messages
function showMessage(type, text) {
    reservationMessage.innerHTML = `
        <div class="message ${type}">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            ${text}
        </div>
    `;
    
    // Auto-hide message after 5 seconds
    setTimeout(() => {
        reservationMessage.innerHTML = '';
    }, 5000);
}