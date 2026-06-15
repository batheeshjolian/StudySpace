// ===================== StudySpace - Auth Page (index.html) =====================

const API_URL = "https://poutf4aqsj.execute-api.us-east-1.amazonaws.com/prod";

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

// If the user is already logged in, skip straight to the booking page.
if (sessionStorage.getItem("studyspace_user")) {
  window.location.href = "booking.html";
}

// ---------- Tab switching ----------
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

// ---------- Password rule ----------
function validatePassword(pw) {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include at least one special character (e.g. ! @ # $).";
  return null;
}

// ---------- Signup ----------
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

    // Auto-login right after a successful signup -> go to booking page
    sessionStorage.setItem(
      "studyspace_user",
      JSON.stringify({ studentId: data.studentId, studentName: data.studentName })
    );
    window.location.href = "booking.html";
  } catch (err) {
    alert("Signup error: " + err.message);
  }
});

// ---------- Login ----------
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

    sessionStorage.setItem(
      "studyspace_user",
      JSON.stringify({ studentId: data.studentId, studentName: data.studentName })
    );
    window.location.href = "booking.html";
  } catch (err) {
    alert("Login error: " + err.message);
  }
});
