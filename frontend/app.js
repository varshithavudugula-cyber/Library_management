const $ = (selector) => document.querySelector(selector);
const state = { books: [], loans: [], mode: "loading" };
const palettes = [
  ["#52745c", "#dce8d8"], ["#c28d69", "#f4e2d2"], ["#65779b", "#dce3f0"],
  ["#9b7b9d", "#eee2ef"], ["#b4a05f", "#f2edcf"], ["#477e84", "#d9eded"]
];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const dateToday = () => new Date().toISOString().slice(0, 10);
const datePlusDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

$("#year").textContent = new Date().getFullYear();
$("#dueDate").min = dateToday();
$("#dueDate").value = datePlusDays(14);

function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function updateStats() {
  const issued = state.loans.filter(l => !l.returned_at);
  $("#totalBooks").textContent = state.books.length;
  $("#availableBooks").textContent = state.books.reduce((sum, b) => sum + Math.max(0, Number(b.total_copies) - Number(b.issued_copies || 0)), 0);
  $("#issuedBooks").textContent = issued.length;
  $("#overdueBooks").textContent = issued.filter(l => l.due_date < dateToday()).length;
}
function renderCategories() {
  const select = $("#categoryFilter"), current = select.value;
  const categories = [...new Set(state.books.map(b => b.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  select.value = categories.includes(current) ? current : "";
}
function renderBooks() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;
  const availability = $("#availabilityFilter").value;
  const books = state.books.filter(b => {
    const searchable = [b.title, b.author, b.isbn, b.category, b.description].join(" ").toLowerCase();
    const available = Number(b.total_copies) > Number(b.issued_copies || 0);
    return (!query || searchable.includes(query)) && (!category || b.category === category) &&
      (!availability || (availability === "available" ? available : !available));
  });
  $("#catalogMessage").textContent = `${books.length} ${books.length === 1 ? "book" : "books"} shown`;
  $("#bookGrid").innerHTML = books.length ? books.map((b, index) => {
    const available = Math.max(0, Number(b.total_copies) - Number(b.issued_copies || 0));
    const [color, pale] = palettes[index % palettes.length];
    return `<article class="book-card">
      <div class="book-cover" style="background:${color}"><span class="cover-lines"></span><span class="cover-letter">${escapeHtml((b.title || "?").charAt(0).toUpperCase())}</span></div>
      <span class="book-category">${escapeHtml(b.category || "Uncategorized")}</span>
      <h3>${escapeHtml(b.title)}</h3><p class="book-author">by ${escapeHtml(b.author)}</p>
      <p class="book-description">${escapeHtml(b.description || "A title in the library's digital collection.")}</p>
      <div class="book-card-bottom"><span class="availability ${available ? "" : "out"}">${available ? `${available} available` : "All issued"}</span><button class="tiny-button" data-issue="${escapeHtml(b.id)}" ${available ? "" : "disabled"}>Issue ↗</button></div>
    </article>`;
  }).join("") : '<div class="empty-cell" style="grid-column:1/-1;padding:45px">No books match that search. Try another title or category.</div>';
  $("#issueBookId").innerHTML = '<option value="">Choose an available book</option>' + state.books
    .filter(b => Number(b.total_copies) > Number(b.issued_copies || 0))
    .map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)} (${Number(b.total_copies) - Number(b.issued_copies || 0)} available)</option>`).join("");
}
function renderLoans() {
  const loans = state.loans.filter(l => !l.returned_at);
  $("#loanCount").textContent = `${loans.length} ${loans.length === 1 ? "loan" : "loans"}`;
  $("#loanTable").innerHTML = loans.length ? loans.map(l => {
    const overdue = l.due_date < dateToday();
    return `<tr><td><div class="loan-title">${escapeHtml(l.book_title || "Book")}</div><div class="loan-sub">${escapeHtml(l.borrower_name)} · ${escapeHtml(l.borrower_id)}</div></td>
      <td>${escapeHtml(l.due_date)}</td><td><span class="status-tag ${overdue ? "overdue" : ""}">${overdue ? "Overdue" : "On loan"}</span></td>
      <td><button class="return-btn" data-return="${escapeHtml(l.id)}">Return</button></td></tr>`;
  }).join("") : '<tr><td colspan="4" class="empty-cell">No active loans yet. Issue a book to see it here.</td></tr>';
}
async function loadData() {
  try {
    const [books, loans, stats] = await Promise.all([api("/books"), api("/loans"), api("/stats")]);
    state.books = books; state.loans = loans; state.mode = "online";
    $("#connectionStatus").textContent = "DATABASE CONNECTED";
    $("#connectionStatus").classList.remove("offline");
    updateStats(); renderCategories(); renderBooks(); renderLoans();
  } catch (error) {
    state.mode = "offline";
    $("#connectionStatus").textContent = "SERVER UNAVAILABLE";
    $("#connectionStatus").classList.add("offline");
    $("#catalogMessage").textContent = `Could not load the catalog: ${error.message}. Start the backend and configure Supabase.`;
    $("#bookGrid").innerHTML = '<div class="empty-cell" style="grid-column:1/-1;padding:35px">The app could not connect to the backend. Follow the README setup steps, then refresh.</div>';
    $("#loanTable").innerHTML = '<tr><td colspan="4" class="empty-cell">Connect the backend to load circulation records.</td></tr>';
  }
}
$("#searchInput").addEventListener("input", renderBooks);
$("#categoryFilter").addEventListener("change", renderBooks);
$("#availabilityFilter").addEventListener("change", renderBooks);
$("#refreshBtn").addEventListener("click", loadData);
$("#bookGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-issue]");
  if (button) { $("#issueBookId").value = button.dataset.issue; $("#borrowerName").focus(); $("#circulation").scrollIntoView({ behavior: "smooth" }); }
});
$("#loanTable").addEventListener("click", async event => {
  const button = event.target.closest("[data-return]");
  if (!button) return;
  if (!confirm("Mark this book as returned?")) return;
  try { await api(`/loans/${encodeURIComponent(button.dataset.return)}/return`, { method: "PATCH", body: "{}" }); toast("Book returned successfully."); await loadData(); }
  catch (error) { toast(error.message); }
});
$("#issueForm").addEventListener("submit", async event => {
  event.preventDefault();
  const body = { book_id: $("#issueBookId").value, borrower_name: $("#borrowerName").value.trim(), borrower_id: $("#borrowerId").value.trim(), due_date: $("#dueDate").value };
  if (!body.book_id || !body.borrower_name || !body.borrower_id || !body.due_date) return toast("Please complete all fields.");
  if (body.due_date < dateToday()) return toast("Due date cannot be in the past.");
  try {
    await api("/loans", { method: "POST", body: JSON.stringify(body) });
    event.target.reset(); $("#dueDate").value = datePlusDays(14); toast("Book issued successfully."); await loadData();
  } catch (error) { toast(error.message); }
});
const dialog = $("#bookDialog");
$("#addBookOpen").addEventListener("click", () => dialog.showModal());
$("#closeBookDialog").addEventListener("click", () => dialog.close());
$("#cancelBook").addEventListener("click", () => dialog.close());
$("#bookForm").addEventListener("submit", async event => {
  event.preventDefault();
  const body = { title: $("#bookTitle").value.trim(), author: $("#bookAuthor").value.trim(), category: $("#bookCategory").value.trim(), isbn: $("#bookIsbn").value.trim() || null, total_copies: Number($("#bookCopies").value), description: $("#bookDescription").value.trim() || null };
  try {
    await api("/books", { method: "POST", body: JSON.stringify(body) });
    dialog.close(); event.target.reset(); $("#bookCopies").value = 1; toast("Book added to the catalog."); await loadData();
  } catch (error) { toast(error.message); }
});
loadData();
