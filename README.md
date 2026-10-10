# 🛒 MADHAN MART - Multi-Role E-Commerce Platform & C++ Backend

[![GitHub Pages Deployment](https://github.com/madhankumarselvam07-hub/Madhan-Mart/actions/workflows/deploy.yml/badge.svg)](https://github.com/madhankumarselvam07-hub/Madhan-Mart/actions)
[![Vercel Compatible](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![Supabase Database](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![C++17 Crow Server](https://img.shields.io/badge/Backend-C%2B%2B17%20Crow-00599C?logo=c%2B%2B)](https://crowcpp.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **"Shop Smart. Live Better."**  
> **Madhan Mart** is a modern, full-stack multi-role commerce ecosystem featuring dedicated portals for **Buyers**, **Sellers**, and **Administrators**. Powered by an interactive client interface with smooth animations, real-time database persistence via **Supabase (PostgreSQL)**, and an optional high-performance **C++17 Crow REST backend**.

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
  - [🛒 1. Buyer Storefront Portal](#1-buyer-storefront-portal-)
  - [🏪 2. Seller Control Center](#2-seller-control-center-)
  - [🛡️ 3. Administrator Super Panel](#3-administrator-super-panel-)
  - [🤖 4. AI Shopping Assistant Chatbot](#4-ai-shopping-assistant-chatbot-)
- [🏗️ System Architecture](#️-system-architecture)
- [📂 Project Structure](#-project-structure)
- [💻 Tech Stack & Libraries](#-tech-stack--libraries)
- [🚀 Quick Start & Installation](#-quick-start--installation)
  - [Method 1: Direct Frontend Launch (Static / GitHub Pages / Vercel)](#method-1-direct-frontend-launch-recommended-for-quick-preview)
  - [Method 2: Full-Stack C++ Crow Server](#method-2-full-stack-c-crow-server)
- [🗄️ Database Setup (Supabase PostgreSQL)](#️-database-setup-supabase-postgresql)
- [📡 Backend API Endpoints](#-backend-api-endpoints)
- [🔒 Security & Performance](#-security--performance)
- [🤝 Contributing](#-contributing)
- [📄 License & Authors](#-license--authors)

---

## ✨ Key Features

### 1. Buyer Storefront Portal 🛒
- **Dynamic Catalog & Filtering**: Browse tech, gaming, laptops, audio, consoles, and peripherals with instant category filtering and real-time live search.
- **Interactive Shopping Cart**: Add items, adjust quantities, calculate live subtotals, and persist items across browser sessions.
- **2-Step Streamlined Checkout**: Complete delivery address details (recipient, address, pincode) and select payment method (**Google Pay / UPI** or **Cash on Delivery**).
- **Live Order History & Tracking**: Real-time order monitoring with dynamic status badges (`Pending`, `Processing`, `Shipped`, `Delivered`).
- **Instant Tax Invoice & Bill Generator**: View printable tax invoices and download crisp **PDF Bills** with one click (via `jsPDF` and `AutoTable`).
- **Product Reviews & Ratings**: Submit star ratings and customer feedback directly into the database.

### 2. Seller Control Center 🏪
- **Store Inventory Management**: Add new products, configure title, category, badge, selling price, MRP, and stock counts.
- **Image Upload Pipeline**: Upload product images directly from device files (with live preview) or link external high-resolution image URLs.
- **Customer Orders Dispatch**: Monitor incoming customer orders, review buyer shipping details, and manage inventory stock in real time.
- **Seller Metrics & KPIs**: Instant overview of active products in store, total orders received, and gross revenue generated.

### 3. Administrator Super Panel 🛡️
- **Platform Analytics & GMV**: Real-time dashboard showing total registered users, master orders, catalog count, and Gross Merchandise Value (GMV).
- **User Registry Governance**: Inspect all registered accounts across Buyer, Seller, and Admin roles.
- **Master Order Dispatch**: Update shipment statuses (`Pending`, `Processing`, `Shipped`, `Delivered`) across the entire marketplace.
- **Catalog Moderation**: Audit active product listings and purge invalid or discontinued entries.
- **CSV Data Export**: Export platform metrics and records for offline reporting.

### 4. AI Shopping Assistant Chatbot 🤖
- **Live Catalog Intelligence**: Built-in floating AI assistant with real-time knowledge of products, prices, deals, stock, and site navigation.
- **Quick Action Chips**: Instant shortcuts for "Best Deals", "PS5 Rate", "Items under ₹10,000", "Laptops", and seller guides.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Client Web Browser] -->|Static Hosting / Pages| B(Frontend: HTML5 / CSS3 / Vanilla JS)
    B -->|Supabase JS SDK v2| C[(Supabase Cloud PostgreSQL)]
    B -->|REST API / Optional| D[C++17 Crow Backend Server]
    D -->|PostgreSQL Connection Pool| C
    
    subgraph "Supabase PostgreSQL Database"
        C --> T1[public.users]
        C --> T2[public.buyers]
        C --> T3[public.sellers]
        C --> T4[public.admins]
        C --> T5[public.products]
        C --> T6[public.orders]
        C --> T7[public.order_items]
        C --> T8[public.reviews]
    end

    subgraph "Client Capabilities"
        B --> F1[GSAP & Lenis Smooth Animations]
        B --> F2[jsPDF Invoice Engine]
        B --> F3[AI Store Advisor Chatbot]
        B --> F4[Role-Based Portal Switching]
    end
```

---

## 📂 Project Structure

```text
Madhan-Mart/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated GitHub Pages CI/CD workflow
├── backend/
│   ├── .env.example                # Template for database credentials
│   ├── CMakeLists.txt              # CMake build configuration for C++ backend
│   ├── main.cpp                    # C++17 Crow HTTP REST server implementation
│   ├── README.md                   # Dedicated backend setup & connection guide
│   └── schema.sql                  # Complete PostgreSQL schema, tables & RLS policies
├── frontend/
│   ├── images/                     # Product images, logos, and favicons
│   ├── dashboard.html              # Multi-role dashboard (Buyer / Seller / Admin)
│   ├── dashboard.css               # Dashboard styling, grid layout & dark mode
│   ├── dashboard.js                # Core dashboard logic, catalog, cart & checkout
│   ├── login.html                  # Role-based login portal
│   ├── login.css                   # Login page styling with interactive mouse spotlight
│   ├── login.js                    # Authentication validation and redirection
│   ├── register.html               # User registration portal with role selector
│   ├── register.css                # Register page styling & responsive layout
│   ├── register.js                 # Account creation logic & validation
│   ├── supabase-client.js          # Supabase client wrapper & role table sync
│   └── index.html                  # Frontend directory fallback
├── index.html                      # Root entry redirect to login portal
├── vercel.json                     # Vercel deployment rewrites & security headers
├── .gitignore                      # Git ignored files (builds, .env, temp files)
└── README.md                       # Project documentation
```

---

## 💻 Tech Stack & Libraries

| Domain | Technology / Library | Description |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, Vanilla CSS3, Modern ES6+ JavaScript | Zero-framework high-speed client architecture |
| **UI Animations** | [GSAP 3](https://greensock.com/gsap/) & [Lenis](https://lenis.darkroom.engineering/) | Butter-smooth scrolling, mouse spotlight halo, and micro-interactions |
| **Database & BaaS** | [Supabase](https://supabase.com/) (PostgreSQL 15) | Real-time database, role tables, and Row Level Security (RLS) |
| **Backend Server** | [Crow C++](https://crowcpp.org/) (C++17) | Ultra-fast multi-threaded micro-framework for REST APIs |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) & AutoTable | Client-side dynamic tax invoice and receipt generation |
| **Cloud & Hosting** | [Vercel](https://vercel.com) & [GitHub Pages](https://pages.github.com) | Automated CI/CD deployment pipelines |

---

## 🚀 Quick Start & Installation

### Method 1: Direct Frontend Launch (Recommended for Quick Preview)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/madhankumarselvam07-hub/Madhan-Mart.git
   cd Madhan-Mart
   ```

2. **Launch with any local static HTTP server:**
   - **Using VS Code**: Right-click `index.html` (or `frontend/login.html`) and select **"Open with Live Server"**.
   - **Using Node.js**:
     ```bash
     npx serve .
     ```
   - **Using Python 3**:
     ```bash
     python -m http.server 3000
     ```

3. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

### Method 2: Full-Stack C++ Crow Server

#### Prerequisites
- **CMake** (v3.15 or higher)
- **C++17** compliant compiler (`g++`, `clang++`, or `MSVC`)
- **Threads** support (POSIX pthreads / Windows threads)
- *(Optional)* `libpqxx` / PostgreSQL dev libraries

#### Step-by-Step Build Instructions

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase PostgreSQL credentials to `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres.yourprojectref:yourpassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://yourprojectref.supabase.co
   SUPABASE_ANON_KEY=your_anon_public_key_here
   PORT=8080
   ```

3. **Build the C++ server using CMake:**
   ```bash
   mkdir build
   cd build
   cmake ..
   cmake --build . --config Release
   ```

4. **Run the server:**
   - **Linux / macOS**:
     ```bash
     ./madhan_mart_server
     ```
   - **Windows**:
     ```powershell
     .\Release\madhan_mart_server.exe
     ```

5. Access the application at **`http://localhost:8080`**.

---

## 🗄️ Database Setup (Supabase PostgreSQL)

To set up the complete schema with sample products and security policies:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and create or select your project.
2. Navigate to the **SQL Editor** tab -> **New Query**.
3. Copy the full contents of [`backend/schema.sql`](backend/schema.sql) and paste them into the SQL editor.
4. Click **Run**.

### Key Tables Created:
- **`public.users`**: Master user directory storing authentication details and role references.
- **`public.buyers`**: Dedicated table for buyer profiles, shipping addresses, and phone contacts.
- **`public.sellers`**: Dedicated table for seller stores, business addresses, and verification flags.
- **`public.admins`**: Dedicated table for administrative access levels (`super_admin`).
- **`public.products`**: Multi-category product catalog with stock counts, ratings, and seller tags.
- **`public.orders` & `public.order_items`**: Order transactions, items ordered, and fulfillment states.
- **`public.reviews`**: Product ratings (1 to 5 stars) and user feedback.

---

## 📡 Backend API Endpoints

When running the C++ Crow server, the following REST endpoints are available:

| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | `{"status": "healthy", "version": "1.0.0"}` |
| `POST` | `/api/auth/login` | User login verification | `{"email": "...", "password": "..."}` |
| `POST` | `/api/auth/register` | New account registration | `{"fullName": "...", "email": "...", "role": "..."}` |
| `GET` | `/` | Serves the login page | Static HTML |
| `GET` | `/dashboard.html` | Serves the main multi-role dashboard | Static HTML |
| `GET` | `/<filename>` | Serves frontend CSS, JS, and image assets | Static Assets |

---

## 🔒 Security & Performance

- **Row Level Security (RLS)**: PostgreSQL policies configured on all public tables to secure data access.
- **Security Response Headers**: Configured via `vercel.json` including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `X-XSS-Protection`.
- **Client-Side Form Validation**: Real-time regex verification for email formatting, password strength, and mandatory checkout fields.
- **Smooth 60FPS UI**: Optimized DOM operations with hardware-accelerated transforms via GSAP.

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are welcome!

1. Fork the repository (`https://github.com/madhankumarselvam07-hub/Madhan-Mart`).
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License & Authors

This project is open source and available under the [MIT License](LICENSE).

Developed with ❤️ by **[Madhan Kumar](https://github.com/madhankumarselvam07-hub)**.
