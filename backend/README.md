# MADHAN MART - Backend & Supabase Integration Guide

This directory contains the **C++17 Crow Server** connected directly to **Supabase (PostgreSQL)**.

---

## 🚀 Quick Step-by-Step Guide to Connect Supabase

### Step 1: Run the Database Schema in Supabase
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the entire contents of [`schema.sql`](file:///c:/Users/HP/Desktop/Madhan%20Mart/backend/schema.sql) and paste it into the editor.
4. Click **Run**. This will create:
   - `users` table
   - `user_sessions` table
   - `products` table (pre-seeded with gaming items)
   - `orders` and `order_items` tables

---

### Step 2: Get your Direct PostgreSQL Connection URI
1. In your Supabase Dashboard, go to **Project Settings** (gear icon) -> **Database**.
2. Scroll down to **Connection parameters** / **Connection string**.
3. Select **URI** (or Transaction Pooler / Session Mode).
4. Copy the connection string (format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`).

---

### Step 3: Create `.env` file in `backend/`
Copy `.env.example` to `.env`:

```env
DATABASE_URL=postgresql://postgres.yourprojectref:yourpassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://yourprojectref.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key_here
PORT=8080
```

---

## 🛠️ Building & Running the C++ Server

```bash
cd backend
mkdir build
cd build
cmake ..
cmake --build .
./madhan_mart_server
```

Once started:
- Access the web app at: **`http://localhost:8080`**
- Health check API: **`http://localhost:8080/api/health`**
- Login API: **`POST http://localhost:8080/api/auth/login`**
- Register API: **`POST http://localhost:8080/api/auth/register`**
