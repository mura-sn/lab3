// Handles data processing and storage
// Import required libraries
const express = require('express');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = 3000;

/* MIDDLEWARE SETUP */
// Enable CORS for cross-origin requests
app.use(cors());
// Parse JSON request bodies
app.use(express.json());
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

/* DATA STORAGE */
// Sample tables data with IDs and seating capacity
let tables = [// Table availability status
    { id: 1, seats: 4, available: true },
    { id: 2, seats: 4, available: true },
    { id: 3, seats: 6, available: true },
    { id: 4, seats: 6, available: true },
    { id: 5, seats: 8, available: true }
];

// Array to store all reservations
let reservations = [];// All reservations stored here

/* HELPER FUNCTIONS */
// Validate reservation time is in the future
function isValidReservationTime(reservationTime) {
    const now = new Date();
    const reservationDate = new Date(reservationTime);
    return reservationDate > now;
}

/* API ENDPOINTS */

// Get all available tables
app.get('/tables', (req, res) => {
    res.json(tables.filter(table => table.available));
});

// Get tables for dropdown (includes current reservation table if editing)
app.get('/available-tables', (req, res) => {
    const currentTableId = req.query.currentReservation ? parseInt(req.query.currentReservation) : null;
    // Show available tables + current reservation table (if editing)
    const availableTables = tables.filter(table => table.available || table.id === currentTableId);
    
    res.json(availableTables.map(table => ({
        id: table.id,
        seats: table.seats,
        available: table.available
    })));
});

// Create or update reservation
app.post('/reservations', (req, res) => {
    const { id, tableNumber, customerName, time, guests } = req.body;
    
    /* VALIDATION CHECKS */
    // Check all required fields are present
    if (!customerName || !guests || !tableNumber || !time) {
        return res.status(400).json({ error: "All fields are required" });
    }
    
    // Check reservation time is in future
    if (!isValidReservationTime(time)) {
        return res.status(400).json({ error: "Reservation time must be in the future" });
    }
    
    // Find the requested table
    const table = tables.find(t => t.id === tableNumber);
    if (!table) {
        return res.status(400).json({ error: `Table ${tableNumber} does not exist` });
    }
    
    // Check if table is available (unless editing same reservation)
    const existingReservation = id ? reservations.find(r => r.id === id) : null;
    const isSameTable = existingReservation && existingReservation.tableNumber === tableNumber;
    
    if (!table.available && !isSameTable) {
        return res.status(400).json({ error: `Table ${tableNumber} is not available` });
    }
    
    // Check table has enough seats
    if (table.seats < guests) {
        return res.status(400).json({ error: `Table ${tableNumber} only has ${table.seats} seats` });
    }
    
    /* UPDATE TABLES AVAILABILITY */
    // If changing tables during edit, free up old table
    if (existingReservation && existingReservation.tableNumber !== tableNumber) {
        const oldTable = tables.find(t => t.id === existingReservation.tableNumber);
        if (oldTable) oldTable.available = true;
    }
    
    // Reserve new table (unless keeping same table)
    if (!isSameTable) {
        table.available = false;
    }
    
    /* CREATE/UPDATED RESERVATION */
    const reservation = {
        id: id || reservations.length + 1, // New ID if creating
        tableNumber,
        customerName,
        time,
        guests
    };
    
    // Update existing or add new reservation
    if (id) {
        const index = reservations.findIndex(r => r.id === id);
        reservations[index] = reservation;
    } else {
        reservations.push(reservation);
    }
    
    res.json({ 
        success: true,
        message: id ? "Reservation updated" : "Reservation created",
        reservation
    });
});

// Get all reservations
app.get('/reservations', (req, res) => {
    res.json(reservations);
});

// Cancel a reservation
app.delete('/reservations/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = reservations.findIndex(r => r.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: "Reservation not found" });
    }
    
    // Free up the table
    const table = tables.find(t => t.id === reservations[index].tableNumber);
    if (table) table.available = true;
    
    // Remove reservation
    reservations.splice(index, 1);
    
    res.json({ 
        success: true,
        message: "Reservation cancelled"
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});