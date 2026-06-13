// StudySpace - Frontend JavaScript

// Later we will replace this with the real API Gateway URL from AWS
const API_URL = "https://poutf4aqsj.execute-api.us-east-1.amazonaws.com/prod";
const bookingForm = document.getElementById("bookingForm");
const bookingsList = document.getElementById("bookingsList");
const refreshBtn = document.getElementById("refreshBtn");

bookingForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const booking = {
    studentName: document.getElementById("studentName").value,
    email: document.getElementById("email").value,
    room: document.getElementById("room").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value
  };

  try {
    const response = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(booking)
    });

    if (!response.ok) {
      throw new Error("Failed to create booking");
    }

    bookingForm.reset();
    alert("Room booked successfully!");
    loadBookings();
  } catch (error) {
    console.error("Error creating booking:", error);
    alert("Error creating booking. Please check the API connection.");
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
        Could not load bookings. API is not connected yet.
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
      <h3>${booking.room}</h3>
      <p><strong>Student:</strong> ${booking.studentName}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <button class="delete-btn" onclick="deleteBooking('${booking.bookingId}')">
        Cancel Booking
      </button>
    `;

    bookingsList.appendChild(item);
  });
}

async function deleteBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Failed to delete booking");
    }

    alert("Booking cancelled successfully!");
    loadBookings();
  } catch (error) {
    console.error("Error deleting booking:", error);
    alert("Error cancelling booking. Please check the API connection.");
  }
}  
