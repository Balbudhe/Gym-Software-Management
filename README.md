# ApexFit — Gym Management SaaS

Multi-tenant MERN application for gym owners and trainers. Each gym is isolated by `gymId` taken from the authenticated JWT — never from the request body.

## Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Recharts
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Multer

The API is a modular monolith (auth, members, trainers, attendance, reports) rather than extra network microservices. That keeps tenant isolation, deployments, and transactions simpler for V1.

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`)

## Setup

```bash
# Backend
cd backend
npm install
copy .env.example .env   # already created for local use
npm run seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

App: http://localhost:5173  
API: http://localhost:5000/api

## Demo logins (after seed)

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Owner   | owner@fitzone.com   | Owner@123    |
| Trainer | amit@fitzone.com    | Trainer@123  |
| Trainer | rahul@fitzone.com   | Trainer@123  |
| Trainer | sneha@fitzone.com   | Trainer@123  |
| Trainer | rohit@fitzone.com   | Trainer@123  |

Or register a new gym from `/register`.

## Image storage

Attendance and profile photos are uploaded with Multer.

- If `CLOUDINARY_*` env vars are set, images go to Cloudinary and only the URL is stored in MongoDB.
- Otherwise files are saved under `backend/uploads` and served at `/uploads`.

Never store large binary files in MongoDB.

## Security notes

- Passwords hashed with bcrypt
- JWT contains `userId`, `gymId`, `role`, `trainerId`
- `authMiddleware` + `roleMiddleware` + `tenantMiddleware` on private routes
- Member `createdByTrainerId` for trainers always comes from the session
- Cross-gym access is blocked by scoping every query with `req.user.gymId`

## Member trainer fields

These are separate and must not be merged:

- `createdByTrainerId` — who created the admission
- `assignedTrainerId` — who currently trains the member
