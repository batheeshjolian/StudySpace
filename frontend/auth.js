// ===================== StudySpace - Auth Page (index.html) =====================
const API_URL = "https://poutf4aqsj.execute-api.us-east-1.amazonaws.com/prod";
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

// Forgot password elements
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const backToLoginLink = document.getElementById("backToLoginLink");
const forgotPasswordSection = document.getElementById("forgotPasswordSection");
const resetStep1 = document.getElementById("resetStep1");
const resetStep2 = document.getElementById("resetStep2");

// If the user is already logged in, skip straight to the booking page.
if (sessionStorage.getItem("studyspace_user")) {
  window.location.href = "booking.html";
}
// ---------- Student ID rule ----------
function validateStudentId(id) {
  return /^\d{9}$/.test(id);
}
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
  const studentId = document.getElementById("signupStudentId").value.trim();
  if (!validateStudentId(studentId)) {
    alert("Student ID must be exactly 9 digits.");
    return;
  }
  const password = document.getElementById("signupPassword").value;
  const pwError = validatePassword(password);
  if (pwError) {
    alert(pwError);
    return;
  }
  const payload = {
    studentName: document.getElementById("signupName").value.trim(),
    studentId: studentId,
    email: document.getElementById("signupEmail").value.trim(),
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
  const studentId = document.getElementById("loginStudentId").value.trim();
  if (!validateStudentId(studentId)) {
    alert("Student ID must be exactly 9 digits.");
    return;
  }
  const payload = {
    studentId: studentId,
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

// ---------- Forgot password: toggle panel ----------
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("hidden");
  forgotPasswordSection.classList.remove("hidden");
});

backToLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordSection.classList.add("hidden");
  resetStep1.classList.remove("hidden");
  resetStep2.classList.add("hidden");
  loginForm.classList.remove("hidden");
});

// ---------- Forgot password: request reset code ----------
document.getElementById("sendResetCodeBtn").addEventListener("click", async () => {
  const studentId = document.getElementById("resetStudentId").value.trim();
  const email = document.getElementById("resetEmail").value.trim();

  if (!validateStudentId(studentId)) {
    alert("Student ID must be exactly 9 digits.");
    return;
  }
  if (!email) {
    alert("Please enter your email.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Could not send reset code.");
    alert("A reset code has been sent to your email.");
    resetStep1.classList.add("hidden");
    resetStep2.classList.remove("hidden");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// ---------- Forgot password: confirm code + set new password ----------
document.getElementById("confirmResetBtn").addEventListener("click", async () => {
  const studentId = document.getElementById("resetStudentId").value.trim();
  const code = document.getElementById("resetCode").value.trim();
  const newPassword = document.getElementById("newPassword").value;

  const pwError = validatePassword(newPassword);
  if (pwError) {
    alert(pwError);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, code, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Invalid or expired code.");
    alert("Password reset successful! You can now log in.");
    backToLoginLink.click();
  } catch (err) {
    alert("Error: " + err.message);
  }
});
