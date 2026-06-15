// ===================== StudySpace - Frontend JavaScript =====================

const API_URL = "https://poutf4aqsj.execute-api.us-east-1.amazonaws.com/prod";

const SINGLE_ROOMS = ["Room A", "Room B"];
const GROUP_ROOMS = ["Room C", "Computer Lab"];

const OPEN_TIME = "08:00";
const CLOSE_TIME = "20:00";
const MAX_HOURS = 3;
const STEP_MIN = 30; // 30-minute slots

// ---------- Element refs ----------
const authView = document.getElementById("authView");
const appView = document.getElementById("appView");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");

const bookingForm = document.getElementById("bookingForm");
const bookingsList = document.getElementById("bookingsList");
const refreshBtn = document.getElementById("refreshBtn");

const dateInput = document.getElementById("date");
const roomSelect = document.getElementById("room");
const startSelect = document.getElementById("startTime");
const endSelect = document.getElementById("endTime");
const friendsGroup = document.getElementById("friendsGroup");
const friendsInput = document.getElementById("friendsIds");

// Current logged-in user (kept in sessionStorage so a refresh keeps you logged in)
let currentUser = JSON.parse(sessionStorage.getItem("studyspace_user") || "null");

// ===================== Helpers =====================
function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTimeStr(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Build the Start Time dropdown (08:00 .. 19:30, leaving room for at least one slot)
function buildStartOptions() {
  startSelect.innerHTML = '<option value="">--</option>';
  const open = toMinutes(OPEN_TIME);
  const close = toMinutes(CLOSE_TIME);
  for (let t = open; t <= close - STEP_MIN; t += STEP_MIN) {
    const opt = document.createElement("option");
    opt.value = toTimeStr(t);
    opt.textContent = toTimeStr(t);
    startSelect.appendChild(opt);
  }
}

// Build the End Time dropdown based on the chosen Start Time:
// from start+30min up to min(start + 3 hours, 20:00)
function buildEndOptions() {
  endSelect.innerHTML = '<option value="">--</option>';
  const start = startSelect.value;
  if (!start) return;

  const startMin = toMinutes(start);
  const close = toMinutes(CLOSE_TIME);
  const latest = Math.min(startMin + MAX_HOURS * 60, close);

  for (let t = startMin + STEP_MIN; t <= latest; t += STEP_MIN) {
    const opt = document.createElement("option");
    opt.value = toTimeStr(t);
    opt.textContent = toTimeStr(t);
    endSelect.appendChild(opt);
  }
}

// ===================== Auth UI toggling =====================
loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
});

signupTab.addEventListener("click", () => {
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

function showApp() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  welcomeText.textContent = `Welcome, ${currentUser.studentName} (ID: ${currentUser.studentId})`;
  initBookingForm();
  loadBookings();
}

function showAuth() {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
}

// ===================== Signup =====================
function validatePassword(pw) {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include at least one special character (e.g. ! @ # $).";
  return null;
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("signupPassword").value;

  const pwError = validatePassword(password);
  if (pwError) {
    alert(pwError);
    return;
  }

  const payload = {
    studentName: document.getElementById("signupName").value.trim(),
    studentId: document.getElementById("signupStudentId").value.trim(),
    password: password
  };

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Signup failed");

    alert("Account created! You can now log in.");
    signupForm.reset();
    loginTab.click();
  } catch (err) {
    alert("Signup error: " + err.message);
  }
});

// ===================== Login =====================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    studentId: document.getElementById("loginStudentId").value.trim(),
    password: document.getElementById("loginPassword").value
  };

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    currentUser = { studentId: data.studentId, studentName: data.studentName };
    sessionStorage.setItem("studyspace_user", JSON.stringify(currentUser));
    loginForm.reset();
    showApp();
  } catch (err) {
    alert("Login error: " + err.message);
  }
});

// ===================== Logout =====================
logoutBtn.addEventListener("click", () => {
  currentUser = null;
  sessionStorage.removeItem("studyspace_user");
  showAuth();
});

// ===================== Booking form setup =====================
function initBookingForm() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);
  buildStartOptions();

  startSelect.addEventListener("change", buildEndOptions);

  roomSelect.addEventListener("change", () => {
    const isGroup = GROUP_ROOMS.includes(roomSelect.value);
    if (isGroup) {
      friendsGroup.classList.remove("hidden");
      friendsInput.setAttribute("required", "required");
    } else {
      friendsGroup.classList.add("hidden");
      friendsInput.removeAttribute("required");
      friendsInput.value = "";
    }
  });
}

// ===================== Create booking =====================
bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  const booking = {
    studentName: currentUser.studentName,
    studentId: currentUser.studentId,
    contact: document.getElementById("contact").value.trim(),
    room: roomSelect.value,
    date: dateInput.value,
    startTime: startSelect.value,
    endTime: endSelect.value,
    friendsIds: friendsInput.value.trim()
  };

  // Light client-side checks (server still re-validates everything)
  if (!booking.room || !booking.startTime || !booking.endTime) {
    alert("Please select a room, start time, and end time.");
    return;
  }

  if (GROUP_ROOMS.includes(booking.room)) {
    const ids = booking.friendsIds.split(",").map((x) => x.trim()).filter(Boolean);
    if (ids.length < 3) {
      alert(`${booking.room} is a group room — enter at least 3 friends' registered student IDs.`);
      return;
    }
  }

  try {
    const response = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create booking");

    // Show the auto-generated cancellation code so the user can save it
    showCodeModal(data.cancellationCode);

    bookingForm.reset();
    friendsGroup.classList.add("hidden");
    endSelect.innerHTML = '<option value="">--</option>';
    loadBookings();
  } catch (error) {
    alert("Error creating booking: " + error.message);
  }
});

// A small modal that displays the cancellation code with a copy button
function showCodeModal(code) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h3>Booking Confirmed</h3>
      <p>Save your cancellation code. You will need it to cancel this booking.</p>
      <div class="code-box" id="codeBox">${code}</div>
      <div class="modal-actions">
        <button id="copyCodeBtn" type="button">Copy Code</button>
        <button id="closeModalBtn" type="button" class="secondary">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById("copyCodeBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(code).then(() => {
      document.getElementById("copyCodeBtn").textContent = "Copied!";
    });
  });
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    overlay.remove();
  });
}

// ===================== Load + display bookings =====================
refreshBtn.addEventListener("click", loadBookings);

async function loadBookings() {
  bookingsList.innerHTML = "<p>Loading bookings...</p>";
  try {
    const response = await fetch(`${API_URL}/bookings`);
    if (!response.ok) throw new Error("Failed to load bookings");
    const bookings = await response.json();
    displayBookings(bookings);
  } catch (error) {
    bookingsList.innerHTML = `<p class="error">Could not load bookings. API is not connected.</p>`;
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
      <p><strong>Contact:</strong> ${booking.contact || ""}</p>
      <p><strong>Date:</strong> ${booking.date || ""}</p>
      <p><strong>Time:</strong> ${booking.startTime || ""} - ${booking.endTime || ""}</p>
      <p><strong>Friends IDs:</strong> ${booking.friendsIds || "None"}</p>
      <button class="delete-btn" onclick="deleteBooking('${booking.bookingId}')">Cancel Booking</button>
    `;
    bookingsList.appendChild(item);
  });
}

async function deleteBooking(bookingId) {
  const code = prompt("Enter your cancellation code (or admin PIN):");
  if (!code) return;
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  try {
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to cancel booking");

    alert("Booking cancelled successfully!");
    loadBookings();
  } catch (error) {
    alert("Error cancelling booking: " + error.message);
  }
}

// ===================== Startup =====================
if (currentUser) {
  showApp();
} else {
  showAuth();
}
