-- Library Circulation and Digital Catalog Management System
-- Run this whole file in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null check (length(trim(title)) > 0),
  author varchar(150) not null check (length(trim(author)) > 0),
  category varchar(80) not null check (length(trim(category)) > 0),
  isbn varchar(30) unique,
  description varchar(1000),
  total_copies integer not null default 1 check (total_copies between 1 and 500),
  issued_copies integer not null default 0 check (issued_copies >= 0 and issued_copies <= total_copies),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  borrower_name varchar(100) not null check (length(trim(borrower_name)) > 0),
  borrower_id varchar(50) not null check (length(trim(borrower_id)) > 0),
  issued_at timestamptz not null default now(),
  due_date date not null,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists books_title_idx on public.books (title);
create index if not exists books_author_idx on public.books (author);
create index if not exists books_category_idx on public.books (category);
create index if not exists loans_active_due_idx on public.loans (due_date) where returned_at is null;
create index if not exists loans_borrower_idx on public.loans (borrower_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists books_updated_at on public.books;
create trigger books_updated_at before update on public.books
for each row execute function public.set_updated_at();

-- Keep issue/return changes atomic: the copy count and loan record change together.
create or replace function public.issue_library_book(
  p_book_id uuid,
  p_borrower_name text,
  p_borrower_id text,
  p_due_date date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_book public.books%rowtype;
declare v_loan public.loans%rowtype;
begin
  select * into v_book from public.books where id = p_book_id for update;
  if not found then raise exception 'BOOK_NOT_AVAILABLE: book does not exist'; end if;
  if v_book.issued_copies >= v_book.total_copies then
    raise exception 'BOOK_NOT_AVAILABLE: no available copies remain';
  end if;
  if p_due_date < current_date then raise exception 'DUE_DATE_INVALID: due date is in the past'; end if;
  insert into public.loans(book_id, borrower_name, borrower_id, due_date)
  values (p_book_id, trim(p_borrower_name), trim(p_borrower_id), p_due_date)
  returning * into v_loan;
  update public.books set issued_copies = issued_copies + 1 where id = p_book_id;
  return jsonb_build_object('id', v_loan.id, 'book_id', v_loan.book_id, 'borrower_name', v_loan.borrower_name,
    'borrower_id', v_loan.borrower_id, 'due_date', v_loan.due_date, 'issued_at', v_loan.issued_at);
end;
$$;

create or replace function public.return_library_book(p_loan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_loan public.loans%rowtype;
begin
  select * into v_loan from public.loans where id = p_loan_id and returned_at is null for update;
  if not found then raise exception 'LOAN_NOT_ACTIVE: active loan does not exist'; end if;
  update public.loans set returned_at = now() where id = p_loan_id;
  update public.books set issued_copies = greatest(0, issued_copies - 1) where id = v_loan.book_id;
  return jsonb_build_object('id', v_loan.id, 'returned_at', now(), 'book_id', v_loan.book_id);
end;
$$;

-- API access is server-side via the secret key; do not expose that key to browsers.
-- RLS is enabled so browser clients cannot access records directly. The Express server
-- uses a server-only secret and validates its inputs. Add proper staff authentication
-- before deploying this app beyond a trusted classroom demonstration.
alter table public.books enable row level security;
alter table public.loans enable row level security;

-- Optional demo records. Remove this block if you prefer an empty catalog.
insert into public.books (title, author, category, isbn, description, total_copies)
values
 ('The Alchemist', 'Paulo Coelho', 'Fiction', '9780062315007', 'A fable about listening to your heart and following a dream.', 4),
 ('Wings of Fire', 'A. P. J. Abdul Kalam', 'Biography', '9788173711466', 'The autobiography of scientist and former Indian president A. P. J. Abdul Kalam.', 3),
 ('Clean Code', 'Robert C. Martin', 'Technology', '9780132350884', 'A practical guide to writing readable, maintainable software.', 2),
 ('Atomic Habits', 'James Clear', 'Self-help', '9780735211292', 'Small habits and systems that support lasting improvement.', 3),
 ('The Guide', 'R. K. Narayan', 'Literature', '9788185986005', 'A classic novel set in the fictional town of Malgudi.', 2),
 ('Introduction to Algorithms', 'Thomas H. Cormen et al.', 'Technology', '9780262046305', 'A comprehensive textbook on algorithms and data structures.', 2)
on conflict (isbn) do nothing;
