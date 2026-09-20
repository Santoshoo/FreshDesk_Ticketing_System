# 🚀 FreshDesk Full-Stack Starter (React Vite Tailwind v4 + Node.js)

A production-ready full-stack starter template featuring **React**, **Vite**, **Tailwind CSS v4** on the frontend, and a **Node.js Express** backend architected with **Models, Repositories, Services, and Controllers**.

---

## 🏗️ Architecture & Project Structure

```
FreshDesk/
├── frontend/                     # React + Vite + Tailwind CSS v4 Frontend
│   ├── src/
│   │   ├── components/           # UI Components (Navbar, ArchitectureCard, UserManagement)
│   │   ├── App.jsx               # Main React App layout
│   │   ├── main.jsx              # React DOM mounting
│   │   └── index.css             # Tailwind v4 import (@import "tailwindcss";)
│   ├── index.html
│   ├── vite.config.js            # Vite config with @tailwindcss/vite plugin & backend proxy
│   └── package.json
│
├── backend/                      # Node.js + Express Layered Architecture
│   ├── src/
│   │   ├── models/               # 🟢 Model Layer: Entity schemas & validation rules
│   │   ├── repositories/         # 🟣 Repository Layer: Data Access Layer (DAL / DB abstraction)
│   │   ├── services/             # 🔵 Service Layer: Pure Business Logic (BLL) & validation
│   │   ├── controllers/          # 🔴 Controller Layer: HTTP req/res handling & HTTP status
│   │   ├── routes/               # 🟡 Routes Layer: API endpoints mapping (/api/users)
│   │   ├── middleware/           # ⚙️ Middleware: Global error handling
│   │   └── server.js             # 🚀 Entry Point: Express app & port listener
│   ├── .env.example
│   ├── .env
│   └── package.json
│
├── .gitignore                    # Root GitIgnore
└── README.md                     # Documentation & Setup Guide
```

---

## ⚙️ Backend Layered Architecture (SOC)

1. **Model Layer (`src/models/`)**: Defines domain entities and schema validation logic.
2. **Repository Layer (`src/repositories/`)**: Abstracted Data Access Layer (DAL) responsible for reading/writing data (can be linked to MongoDB, PostgreSQL, Prisma, Mongoose, etc.).
3. **Service Layer (`src/services/`)**: Implements pure business logic, validations, and rules.
4. **Controller Layer (`src/controllers/`)**: Manages incoming requests (`req`), delegates to services, and returns standardized responses (`res`).

---

## ⚡ Quick Start & Local Execution

### 1. Install Dependencies

Install packages for both backend and frontend:

```bash
# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Run the Backend Server

```bash
cd backend
npm run dev
```
*Backend will run on `http://localhost:5000`*

### 3. Run the Frontend Dev Server

In a new terminal window:

```bash
cd frontend
npm run dev
```
*Frontend will run on `http://localhost:5173`*

---

## 🐙 Pushing to GitHub (Step-by-Step)

Follow these simple commands to push this codebase to your GitHub repository:

### 1. Initialize Git in the Root Directory

```bash
# Navigate to the project root
cd FreshDesk

# Initialize git repository
git init

# Check status (node_modules and .env files are automatically ignored)
git status
```

### 2. Stage and Commit Files

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: React Vite Tailwind v4 frontend with Node.js layered backend"
```

### 3. Push to GitHub

Create a new repository on [GitHub](https://github.com/new) (do **not** check "Initialize with a README"), then run:

```bash
# Change main branch name
git branch -M main

# Link your local repository to your remote GitHub repo (replace URL below with yours)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# Push your code to GitHub
git push -u origin main
```

---

## 🧪 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Check backend server status |
| `GET` | `/api/users` | Fetch all users |
| `GET` | `/api/users/:id` | Fetch user by ID |
| `POST` | `/api/users` | Create new user (validated via Model & Service) |
| `DELETE` | `/api/users/:id` | Delete user by ID |

---

## 🎨 Tech Stack Summary

- **Frontend**: React 18, Vite 5, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React Icons
- **Backend**: Node.js, Express, ES Modules (`"type": "module"`), Cors, Dotenv, Nodemon
