# SIM Hewan Qurban

Web-based qurban animal sales management system.

## Structure
- `backend/` — Laravel 11 API
- `frontend/` — Next.js 14 App

## Requirements
- PHP 8.2+, Composer
- Node.js 20+, npm
- PostgreSQL 16
- Redis

## Quick Start

1. Copy env files:
   ```bash
   cp .env.example backend/.env
   cp .env.example frontend/.env.local
   ```

2. Start backend (port 8000):
   ```bash
   cd backend && php artisan serve
   ```

3. Start frontend (port 3000):
   ```bash
   cd frontend && npm run dev
   ```

## Setup
See `backend/README.md` and `frontend/README.md`.
