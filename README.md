# Library Circulation and Digital Catalog Management System

A beginner-friendly full-stack college project for maintaining a searchable library catalog and tracking book issues, due dates, and returns.

## 1. Problem statement

Manual library registers make it difficult to search for titles, know whether copies are available, and track due dates. This application provides a digital catalog and a simple circulation desk in one responsive web interface.

## 2. Objectives and features

- Search books by title, author, ISBN, category, and description.
- Filter the catalog by category and availability.
- Show total titles, available copies, active loans, and overdue loans.
- Add books to the catalog.
- Issue an available book to a borrower with an ID and due date.
- Record returns and update copy counts.
- Validate user input on both the browser and server.
- Store data in Supabase PostgreSQL.
- Responsive layout for desktop, tablet, and mobile.

### Scope and security note

This is a classroom MVP. The current interface does **not** implement staff login or role-based access, so do not expose it to the public internet or use it with real private student information. Before deployment, add Supabase Auth or another verified staff-authentication method and enforce authorization on every management endpoint. The Supabase secret/service-role key must remain on the server.

## 3. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js 20+ and Express 5
- Supabase PostgreSQL
- Git and GitHub
- npm packages: `express`, `@supabase/supabase-js`, `dotenv`, `helmet`

## 4. Folder structure

```text
library-circulation-digital-catalog-management-system/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── middleware/
│   │   └── validate.js
│   ├── routes/
│   │   ├── books.js
│   │   └── loans.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## 5. Prerequisites

Install:
- [Node.js LTS](https://nodejs.org/) (includes npm; use Node 20 or newer)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)
- A free [Supabase](https://supabase.com/) account

Verify in a terminal:
```bash
node --version
npm --version
git --version
```

## 6. Set up Supabase

1. Sign in to Supabase and create a new project.
2. Wait until the database is ready.
3. Open **SQL Editor → New query**.
4. Open `database/schema.sql`, copy its complete contents into the editor, and click **Run**.
5. Open **Table Editor** and confirm `books` and `loans` exist. The SQL inserts six demo titles.
6. In the project's API/settings page, copy the Project URL and the server-side secret/service-role key. Supabase labels may differ depending on the dashboard version. Use a secret key only on the backend; never use it in browser JavaScript or commit it to GitHub.

The schema enables Row Level Security (RLS). Browser clients have no direct database credentials; requests go through Express. The server key bypasses RLS, so backend authorization is essential. This MVP is intended for a local classroom demo only until staff authentication and authorization are added.

## 7. Configure the backend

Open a terminal in the project root, then run:

```bash
cd backend
npm install
```

Create a file named `.env` inside `backend/` by copying `.env.example`. Fill in your own values:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SECRET_KEY
```

Do not include quote marks unless your value requires them. Never share the `.env` file or commit it. `.env.example` contains placeholder names only and is safe to commit.

## 8. Run the application

From the `backend/` directory:

```bash
npm run dev
```

You should see:
```text
Library app running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Keep the terminal open while using the app.

Check the health endpoint at [http://localhost:3000/api/health](http://localhost:3000/api/health). It should return JSON with `"status":"ok"` and `"databaseConfigured":true`.

## 9. API endpoints

All responses are JSON. The backend returns a helpful error message when validation fails.

| Method | Endpoint | Purpose | Request |
|---|---|---|---|
| GET | `/api/health` | Check server status and whether credentials are configured | None |
| GET | `/api/stats` | Catalog and circulation summary | None |
| GET | `/api/books` | List catalog books | None |
| POST | `/api/books` | Add a book | `title`, `author`, `category`, optional `isbn`, `description`, `total_copies` |
| GET | `/api/loans` | List active loans | None |
| POST | `/api/loans` | Issue an available copy | `book_id`, `borrower_name`, `borrower_id`, `due_date` (`YYYY-MM-DD`) |
| PATCH | `/api/loans/:id/return` | Mark an active loan returned | No body required |

**Authentication:** These endpoints are not yet protected by staff login. Run locally for demonstration only. Add authentication and role-based authorization before sharing publicly. The service-role key is kept in `backend/.env` and is never sent to the browser.

## 10. Database design

- `books`: title, author, category, ISBN, description, total copies, issued copies, timestamps.
- `loans`: book reference, borrower name and ID, issue date, due date, return timestamp.
- Foreign key from `loans.book_id` to `books.id` prevents deleting a book with loan history.
- SQL functions `issue_library_book` and `return_library_book` update loan records and copy counts atomically to avoid oversubscribing copies.
- Indexes support common title, author, category, due-date, and borrower searches.

## 11. Test checklist

1. Start the server and open `/api/health`; expect `status: ok`.
2. Load the home page; expect sample books from Supabase.
3. Search for “Clean Code”; only matching records should show.
4. Filter by Technology and by availability.
5. Add a book with valid fields; expect it to appear in the catalog.
6. Submit an empty title or author; expect a validation message.
7. Issue an available book with a borrower name, ID, and future due date; expect a new active loan and one fewer available copy.
8. Attempt to issue the final copy twice; the second request should return HTTP 409.
9. Return a loan; expect it to disappear from Active Loans and the available-copy count to increase.
10. Try an invalid due date or missing borrower ID; expect HTTP 400.
11. Resize the browser to phone width; check that cards and forms fit and the table can scroll horizontally.
12. Remove Supabase configuration temporarily and restart; the page should show a connection/setup error instead of fake data.

## 12. Troubleshooting

- **`npm` or `node` not found:** Install Node.js LTS, close and reopen the terminal, and retry `node --version`.
- **`Database is not configured`:** Confirm `backend/.env` exists and the variable names match `.env.example`; restart the server after editing it.
- **Supabase authentication/permission error:** Confirm the Project URL and server-only key belong to the same project. Do not paste the key into frontend files.
- **Table does not exist:** Run all of `database/schema.sql` in the Supabase SQL Editor.
- **Book issue fails:** Ensure the selected book has available copies and the due date is today or later.
- **Port already in use:** Set `PORT=3001` in `.env` and open `http://localhost:3001`.
- **Page does not update:** Check the backend terminal and browser developer console, then click Refresh.

## 13. Git and GitHub

From the **project root** (not the `backend` directory):

```bash
git init
git status
git add .
git status
git commit -m "Build library management project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Create an empty repository on GitHub first and replace `YOUR_GITHUB_REPOSITORY_URL` with its real URL. Before committing, confirm `backend/.env`, `node_modules/`, and any private data are not staged. `.env.example` should be included. A `.gitignore` file does not remove secrets already committed; rotate exposed credentials immediately.

## 14. Architecture

Browser (HTML/CSS/JS) → `fetch()` → Express API → Supabase client → PostgreSQL tables/functions. Supabase credentials are read from server environment variables only. The browser never connects directly to the database.

## 15. Future improvements

- Staff/admin login using Supabase Auth, with verified roles and protected API routes.
- Edit and archive books, plus a full loan history page.
- Loan limits, renewals, reservations, and email reminders.
- Exportable reports and barcode/QR scanning.
- Automated API tests and deployment after security hardening.
