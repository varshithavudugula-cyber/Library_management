require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const booksRouter = require("./routes/books");
const loansRouter = require("./routes/loans");
const { supabase } = require("./supabase");

const app = express();
const port = Number(process.env.PORT) || 3000;
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/api/health", (req, res) => res.json({ status: "ok", databaseConfigured: Boolean(supabase) }));
app.get("/api/stats", async (req, res, next) => {
  if (!supabase) return res.status(503).json({ error: "Database is not configured." });
  try {
    const [{ data: books, error: bookError }, { data: loans, error: loanError }] = await Promise.all([
      supabase.from("books").select("total_copies,issued_copies"),
      supabase.from("loans").select("due_date").is("returned_at", null)
    ]);
    if (bookError) throw bookError;
    if (loanError) throw loanError;
    const totalTitles = books.length;
    const totalCopies = books.reduce((sum, b) => sum + Number(b.total_copies), 0);
    const issuedCopies = books.reduce((sum, b) => sum + Number(b.issued_copies), 0);
    const today = new Date().toISOString().slice(0, 10);
    res.json({ totalTitles, totalCopies, availableCopies: totalCopies - issuedCopies, issuedCopies, overdueLoans: loans.filter(l => l.due_date < today).length });
  } catch (error) { next(error); }
});
app.use("/api/books", booksRouter);
app.use("/api/loans", loansRouter);
app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "index.html")));
app.use((error, req, res, next) => {
  console.error("API error:", error.message);
  if (res.headersSent) return next(error);
  const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? "Something went wrong on the server. Check server logs and database setup." : error.message });
});
app.listen(port, () => console.log(`Library app running at http://localhost:${port}`));
