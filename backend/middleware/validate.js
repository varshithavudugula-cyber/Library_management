function validateBook(req, res, next) {
  const { title, author, category, total_copies } = req.body || {};
  if (typeof title !== "string" || !title.trim() || title.trim().length > 200)
    return res.status(400).json({ error: "Title is required and must be under 200 characters." });
  if (typeof author !== "string" || !author.trim() || author.trim().length > 150)
    return res.status(400).json({ error: "Author is required and must be under 150 characters." });
  if (typeof category !== "string" || !category.trim() || category.trim().length > 80)
    return res.status(400).json({ error: "Category is required and must be under 80 characters." });
  if (!Number.isInteger(Number(total_copies)) || Number(total_copies) < 1 || Number(total_copies) > 500)
    return res.status(400).json({ error: "Total copies must be a whole number from 1 to 500." });
  next();
}
function validateLoan(req, res, next) {
  const { book_id, borrower_name, borrower_id, due_date } = req.body || {};
  if (typeof book_id !== "string" || !book_id.trim())
    return res.status(400).json({ error: "Choose a book to issue." });
  if (typeof borrower_name !== "string" || !borrower_name.trim() || borrower_name.trim().length > 100)
    return res.status(400).json({ error: "Borrower name is required (maximum 100 characters)." });
  if (typeof borrower_id !== "string" || !borrower_id.trim() || borrower_id.trim().length > 50)
    return res.status(400).json({ error: "Borrower ID is required (maximum 50 characters)." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(due_date)) || Number.isNaN(Date.parse(`${due_date}T00:00:00Z`)))
    return res.status(400).json({ error: "Due date must be a valid date in YYYY-MM-DD format." });
  if (due_date < new Date().toISOString().slice(0, 10))
    return res.status(400).json({ error: "Due date cannot be in the past." });
  next();
}
module.exports = { validateBook, validateLoan };
