const express = require("express");
const { supabase } = require("../supabase");
const { validateLoan } = require("../middleware/validate");
const router = express.Router();
const dbRequired = (res) => {
  if (!supabase) { res.status(503).json({ error: "Database is not configured. Add Supabase credentials to backend/.env." }); return false; }
  return true;
};

router.get("/", async (req, res, next) => {
  if (!dbRequired(res)) return;
  try {
    const { data, error } = await supabase.from("loans")
      .select("id,book_id,borrower_name,borrower_id,issued_at,due_date,returned_at,books(title)")
      .is("returned_at", null).order("due_date");
    if (error) throw error;
    res.json(data.map(row => ({ ...row, book_title: row.books?.title || "Book", books: undefined })));
  } catch (error) { next(error); }
});

router.post("/", validateLoan, async (req, res, next) => {
  if (!dbRequired(res)) return;
  try {
    const { data, error } = await supabase.rpc("issue_library_book", {
      p_book_id: req.body.book_id,
      p_borrower_name: req.body.borrower_name.trim(),
      p_borrower_id: req.body.borrower_id.trim(),
      p_due_date: req.body.due_date
    });
    if (error) {
      if (error.message?.includes("BOOK_NOT_AVAILABLE")) return res.status(409).json({ error: "No available copies remain for this book." });
      throw error;
    }
    res.status(201).json(data);
  } catch (error) { next(error); }
});

router.patch("/:id/return", async (req, res, next) => {
  if (!dbRequired(res)) return;
  try {
    const { data, error } = await supabase.rpc("return_library_book", { p_loan_id: req.params.id });
    if (error) {
      if (error.message?.includes("LOAN_NOT_ACTIVE")) return res.status(404).json({ error: "Active loan not found; it may already be returned." });
      throw error;
    }
    res.json(data);
  } catch (error) { next(error); }
});

module.exports = router;
