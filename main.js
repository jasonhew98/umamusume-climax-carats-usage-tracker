import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://hvhjoyiehmkdovgpytas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_y-kXTtuvPcBrkQxQTWdRKQ_eIPRTY7R";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let selected = null;
let entries = [];

// Elements
const authDiv = document.getElementById("auth");
const userDiv = document.getElementById("user-info");
const userDisplay = document.getElementById("user-display");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

const formContainer = document.getElementById("form-container");
const options = document.querySelectorAll(".option");
const entriesDiv = document.getElementById("entries");
const totalEl = document.getElementById("total");

// --- Check session on load ---
(async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) showUser(session.user);
})();

async function showUser(user) {
  authDiv.style.display = "none";
  userDiv.style.display = "flex";
  const username = user.email;
  userDisplay.textContent = username;
  formContainer.style.display = "flex";
  await refresh();
}

function showAuth() {
  authDiv.style.display = "flex";
  userDiv.style.display = "none";
  formContainer.style.display = "none";
}

// --- Login ---
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Please enter email and password");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return alert(error.message);
  showUser(data.user);
});

// --- Sign Up ---
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert("Please enter email and password");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return alert(error.message);
  alert("Sign up successful! You can now login.");
});

// --- Logout ---
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showAuth();
  entries = [];
  render();
});

async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// =========================
// Data
// =========================
async function loadEntries() {
  const { data, error } = await supabase
    .from("carat_usages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

async function addEntry(amount) {
  const user = await getUser();
  if (!user) return alert("Login first");

  const { error } = await supabase
    .from("carat_usages")
    .insert([{ user_id: user.id, amount }]);

  if (error) return alert("Failed");

  refresh();
}

async function deleteEntry(id) {
  await supabase.from("carat_usages").delete().eq("id", id);
  refresh();
}

async function refresh() {
  entries = await loadEntries();
  render();
}

function render() {
  const total = entries.reduce((a, b) => a + b.amount, 0);
  totalEl.textContent = total;

  if (!entries.length) {
    entriesDiv.innerHTML = '<div class="note">No entries</div>';
    return;
  }

  entriesDiv.innerHTML = "";

  entries.forEach((e) => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
        <div>
          <strong>${e.amount}</strong>
          <div class="note">${new Date(e.created_at).toLocaleString()}</div>
        </div>
        <button onclick="deleteEntry('${e.id}')">Delete</button>
      `;

    entriesDiv.appendChild(div);
  });
}

// Grab the manual input element
const manualInput = document.getElementById("manual-amount");

// =========================
// Selection Logic
// =========================
options.forEach((btn) => {
  btn.onclick = () => {
    // 1. Set the selected variable
    selected = Number(btn.dataset.value);

    // 2. Update button visuals
    options.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    // 3. Clear the manual input so there's no confusion
    manualInput.value = "";
  };
});

// Listen for typing in the manual input
manualInput.addEventListener("input", () => {
  // If the user types anything, clear the preset button selection
  if (manualInput.value) {
    selected = null;
    options.forEach((b) => b.classList.remove("selected"));
  }
});

// =========================
// Submit Logic
// =========================
document.getElementById("form").onsubmit = (e) => {
  e.preventDefault();

  // Determine the final value to submit. 
  // If manualInput has a number, use it. Otherwise, use 'selected'.
  let finalValue = manualInput.value ? Number(manualInput.value) : selected;

  // Validation: Check if it's empty, 0, or a negative number
  if (!finalValue || finalValue <= 0) {
    return alert("Please select or enter a valid amount.");
  }

  // Submit to Supabase
  addEntry(finalValue);

  // Optional: Reset the form visually after submission
  selected = null;
  options.forEach((b) => b.classList.remove("selected"));
  manualInput.value = "";
};

// expose delete globally
window.deleteEntry = deleteEntry;
