# Blogify

A full-stack blog platform: Node.js, Express, MongoDB (Mongoose), JWT authentication, Multer for file uploads, and an EJS server-rendered frontend. A JSON API is also available under `/api` for use from Postman, a mobile app, or a future React/Vue frontend.

## Tech Stack
- **Node.js** + **Express.js** — server & routing
- **MongoDB** + **Mongoose** — database & ODM
- **EJS** — server-rendered HTML views (the "fullstack" part)
- **JWT (jsonwebtoken)** — authentication, stored in an httpOnly cookie for the browser and read from the `Authorization` header for the JSON API
- **bcryptjs** — password hashing
- **Multer** — image uploads (avatars & blog cover images)
- **method-override** — lets plain HTML forms send PUT/DELETE requests

## Project Structure
```
blogify/
├── config/
│   └── db.js                     # MongoDB connection
├── controllers/
│   ├── authController.js         # JSON API: register / login / profile
│   ├── blogController.js         # JSON API: blog CRUD
│   └── viewController.js         # EJS pages: renders views + handles form posts
├── middleware/
│   ├── authMiddleware.js         # JWT check for the JSON API (reads Authorization header)
│   ├── viewAuthMiddleware.js     # JWT check for the frontend (reads the cookie)
│   └── uploadMiddleware.js       # Multer config (image validation, 5MB limit)
├── models/
│   ├── User.js
│   └── Blog.js
├── routes/
│   ├── authRoutes.js             # /api/auth/*
│   ├── blogRoutes.js             # /api/blogs/*
│   └── viewRoutes.js             # /, /login, /register, /blogs/*, /dashboard
├── views/                        # EJS templates
│   ├── partials/ (head, navbar, footer)
│   ├── index.ejs, blog-detail.ejs, blog-form.ejs
│   ├── login.ejs, register.ejs, dashboard.ejs, 404.ejs
├── public/css/style.css          # frontend styling
├── uploads/                      # uploaded images, served statically
├── .env.example
├── server.js
└── package.json
```

## How the frontend and API relate
Both share the same models, MongoDB, and Multer upload logic — they just differ in **how auth is carried** and **what they return**:
- **JSON API** (`/api/...`): expects `Authorization: Bearer <token>`, always returns JSON. Good for Postman or a separate frontend app.
- **EJS frontend** (`/`, `/login`, `/blogs/...`): after login/register, the JWT is set as an httpOnly cookie automatically. Every page request reads that cookie via `checkUser` middleware, and protected pages (`/dashboard`, `/blogs/new`, edit/delete) redirect to `/login` if there's no valid cookie, instead of returning a 401 JSON error.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (copy `.env.example`) and fill in your values:
   ```
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/blogify
   JWT_SECRET=replace_this_with_a_long_random_secret
   JWT_EXPIRES_IN=7d
   ```

3. Start MongoDB locally, or use MongoDB Atlas and paste its connection string into `MONGO_URI`.

4. Run the server:
   ```bash
   npm run dev    # with nodemon
   # or
   npm start
   ```

Open `http://localhost:5000` in your browser for the full site, or hit `http://localhost:5000/api/...` for the JSON API.

## Frontend Pages

| Method | Route              | Access  | Description                        |
|--------|---------------------|---------|--------------------------------------|
| GET    | `/`                 | Public  | Homepage — lists all posts (paginated) |
| GET    | `/blogs/:id`        | Public  | Single post detail page              |
| GET    | `/register`         | Public  | Sign-up form (avatar upload optional)|
| POST   | `/register`         | Public  | Creates account, logs in, redirects to dashboard |
| GET    | `/login`            | Public  | Login form                           |
| POST   | `/login`            | Public  | Authenticates, sets cookie, redirects|
| POST   | `/logout`           | Public  | Clears the auth cookie               |
| GET    | `/dashboard`        | Private | Lists the logged-in user's own posts |
| GET    | `/blogs/new`        | Private | New post form                        |
| POST   | `/blogs`            | Private | Creates a post (with cover image)    |
| GET    | `/blogs/:id/edit`   | Private | Edit form (author only)              |
| PUT    | `/blogs/:id`        | Private | Updates a post (author only)         |
| DELETE | `/blogs/:id`        | Private | Deletes a post (author only)         |

## API Reference

### Auth

| Method | Endpoint             | Access  | Description                              |
|--------|-----------------------|---------|-------------------------------------------|
| POST   | `/api/auth/register`  | Public  | Register user (`avatar` field optional, multipart/form-data) |
| POST   | `/api/auth/login`     | Public  | Login, returns JWT                        |
| GET    | `/api/auth/me`        | Private | Get current logged-in user's profile      |

**Register** (multipart/form-data):
```
name: John Doe
email: john@example.com
password: secret123
avatar: <file> (optional)
```

**Login** (JSON):
```json
{ "email": "john@example.com", "password": "secret123" }
```

Response includes a `token` — send it on protected requests as:
```
Authorization: Bearer <token>
```

### Blogs

| Method | Endpoint          | Access  | Description                          |
|--------|--------------------|---------|----------------------------------------|
| GET    | `/api/blogs`       | Public  | List blogs (`?page=1&limit=10`)        |
| GET    | `/api/blogs/:id`   | Public  | Get single blog                        |
| POST   | `/api/blogs`       | Private | Create blog (`coverImage` optional)    |
| PUT    | `/api/blogs/:id`   | Private | Update blog (author only)              |
| DELETE | `/api/blogs/:id`   | Private | Delete blog (author only)              |

**Create blog** (multipart/form-data, requires `Authorization: Bearer <token>`):
```
title: My First Post
content: This is the blog content...
tags: nodejs,mongodb,jwt
coverImage: <file> (optional)
```

## Notes
- Passwords are hashed with bcrypt before saving.
- Multer restricts uploads to image files (jpeg, jpg, png, webp, gif) up to 5MB.
- Uploaded files are served from `/uploads/<filename>`.
- Only a blog's author can update or delete it.
- Extend `models/User.js`'s `role` field + `authorize()` middleware if you need admin-only routes.
