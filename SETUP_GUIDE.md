# Advanced Calculator System - Setup Guide

This is a production-ready Full-stack Advanced Calculator System with User Authentication, History Tracking, and Analytics.

## Stack
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy ORM, JWT
- **Frontend:** HTML, Vanilla CSS (Glassmorphism), Vanilla JavaScript, Chart.js

## 1. Database Setup (pgAdmin4 / PostgreSQL)
1. Ensure PostgreSQL is installed and running on your system.
2. Open pgAdmin4 or `psql` and create a database named `calculator_db`.
    ```sql
    CREATE DATABASE calculator_db;
    ```
3. Set your connection string as an environment variable or verify the default matches your local config in `backend/app/database.py`. The default is:
    ```
    postgresql://postgres:password@localhost/calculator_db
    ```
   *(Update `postgres` and `password` to match your local superuser account).*

## 2. Backend Setup
1. Open PowerShell or Command Prompt. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The server runs at `http://127.0.0.1:8000`.*
   *You can visit the auto-generated Swagger UI docs at `http://127.0.0.1:8000/docs` to test the API directly.*

## 3. Frontend Setup
1. Navigate to the `frontend` folder.
2. Since it's pure HTML/CSS/JS with relative paths, you can test it locally by running a simple server (this helps avoid aggressive CORS issues with `file://`):
   ```bash
   # Using python module (from frontend folder)
   python -m http.server 5500
   ```
3. Open `http://localhost:5500/login.html` in your web browser.

## 4. API Testing Guide (Postman / Curl)
If you wish to test the APIs without the frontend:

**Register:**
```bash
curl -X POST "http://127.0.0.1:8000/auth/register" \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser", "email":"test@test.com", "password":"password123"}'
```

**Login (Get Token):**
```bash
curl -X POST "http://127.0.0.1:8000/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=testuser&password=password123"
```
*(Copy the `access_token` from the response).*

**Calculate Expression:**
```bash
curl -X POST "http://127.0.0.1:8000/api/calculate" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"expression": "5 + 5 * 2 - sin(0)"}'
```

**Get History:**
```bash
curl -X GET "http://127.0.0.1:8000/api/history?skip=0&limit=10" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Security Overview
- **Ast safe_eval**: The math parser uses python `ast` tree traversal to evaluate explicitly authorized operations. It prevents malicious code injection vectors typically exposed via `eval()`.
- **JWT Auth**: Password is encrypted strictly using `bcrypt`.
- **CORS Handling**: Properly bounded to avoid unauthorized domains in production (currently wildcard `*` for easy local portfolio demonstration).
