// StudySpace - Frontend JavaScript

const API_URL = "https://poutf4aqsj.execute-api.us-east-1.amazonaws.com/prod";

const bookingForm = document.getElementById("bookingForm");
const bookingsList = document.getElementById("bookingsList");
const refreshBtn = document.getElementById("refreshBtn");
const dateInput = document.getElementById("date");

// Prevent choosing a past date in the browser
const today = new Date().toISOString().split("T")[0];
dateInput.setAttribute("min", today);

bookingForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const booking = {
    studentName: document.getElementById("studentName").value.trim(),
    studentId: document.getElementById("studentId").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    room: document.getElementById("room").value,
    date: document.getElementById("date").value,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    friendsIds: document.getElementById("friendsIds").value.trim(),
    cancellationCode: document.getElementById("cancellationCode").value.trim()
  };

  // Frontend validation: past date or past time
  const now = new Date();
  const selectedStartDateTime = new Date(`${booking.date}T${booking.startTime}`);

  if (selectedStartDateTime < now) {
    alert("You cannot book a room for a past date or past time.");
    return;
  }

  // Frontend validation: end time must be after start time
  const selectedEndDateTime = new Date(`${booking.date}T${booking.endTime}`);

  if (selectedEndDateTime <= selectedStartDateTime) {
    alert("End time must be after start time.");
    return;
  }

  // Frontend validation: maximum 3 hours
  const durationHours = (selectedEndDateTime - selectedStartDateTime) / (1000 * 60 * 60);

  if (durationHours > 3) {
    alert("Booking duration cannot be more than 3 hours.");
    return;
  }

  // Frontend validation: working hours 08:00-20:00
  if (booking.startTime < "08:00" || booking.endTime > "20:00") {
    alert("Booking must be within working hours: 08:00-20:00.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(booking)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create booking");
    }

    bookingForm.reset();
    alert("Room booked successfully!");
    loadBookings();
  } catch (error) {
    console.error("Error creating booking:", error);
    alert("Error creating booking: " + error.message);
  }
});

refreshBtn.addEventListener("click", loadBookings);

async function loadBookings() {
  bookingsList.innerHTML = "<p>Loading bookings...</p>";

  try {
    const response = await fetch(`${API_URL}/bookings`);

    if (!response.ok) {
      throw new Error("Failed to load bookings");
    }

    const bookings = await response.json();
    displayBookings(bookings);
  } catch (error) {
    console.error("Error loading bookings:", error);
    bookingsList.innerHTML = `
      <p class="error">
        Could not load bookings. API is not connected.
      </p>
    `;
  }
}

function displayBookings(bookings) {
  if (!bookings || bookings.length === 0) {
    bookingsList.innerHTML = "<p>No bookings found.</p>";
    return;
  }

  bookingsList.innerHTML = "";

  bookings.forEach((booking) => {
    const item = document.createElement("div");
    item.className = "booking-item";

    item.innerHTML = `
      <h3>${booking.room || ""}</h3>
      <p><strong>Status:</strong> ${booking.status || "Reserved"}</p>
      <p><strong>Student:</strong> ${booking.studentName || ""}</p>
      <p><strong>Student ID:</strong> ${booking.studentId || ""}</p>
      <p><strong>Contact:</strong> ${booking.contact || booking.email || ""}</p>
      <p><strong>Date:</strong> ${booking.date || ""}</p>
      <p><strong>Start Time:</strong> ${booking.startTime || booking.time || ""}</p>
      <p><strong>End Time:</strong> ${booking.endTime || ""}</p>
      <p><strong>Friends IDs:</strong> ${booking.friendsIds || "None"}</p>
      <button class="delete-btn" onclick="deleteBooking('${booking.bookingId}')">
        Cancel Booking
      </button>
    `;

    bookingsList.appendChild(item);
  });
}

async function deleteBooking(bookingId) {
  const code = prompt("Enter your cancellation code or admin PIN:");

  if (!code) {
    return;
  }

  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: code
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete booking");
    }

    alert("Booking cancelled successfully!");
    loadBookings();
  } catch (error) {
    console.error("Error cancelling booking:", error);
    alert("Error cancelling booking: " + error.message);
  }
}

// Load bookings automatically when the page opens
loadBookings();
