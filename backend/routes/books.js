const express = require("express");
const { supabase } = require("../supabase");
const { validateBook } = require("../middleware/validate");
const router = express.Router();
const dbRequired = (res) => {
  if (!supabase) { res.status(503).json({ error: "Database is not configured. Add Supabase credentials to backend/.env." }); return false; }
  return true;
};

router.get("/", async (req, res, next) => {
  if (!dbRequired(res)) return;
  try {
    const { data, error } = await supabase.from("books").select("id,title,author,category,isbn,description,total_copies,issued_copies,created_at").order("title");
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});

router.post("/", validateBook, async (req, res, next) => {
  if (!dbRequired(res)) return;
  try {
    const book = {
      title: req.body.title.trim(), author: req.body.author.trim(), category: req.body.category.trim(),
      isbn: req.body.isbn ? String(req.body.isbn).trim() : null,
      description: req.body.description ? String(req.body.description).trim() : null,
      total_copies: Number(req.body.total_copies)
    };
    const { data, error } = await supabase.from("books").insert(book).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) { next(error); }
});

module.exports = router;
