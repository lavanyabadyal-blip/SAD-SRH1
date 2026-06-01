# Student Management System (SMS)

A microservices-based backend for managing students, professors, courses, and enrollments. Built with Node.js, Express, MongoDB, and JWT authentication using RS256 + JWKS.

## Architecture

Five independent services that communicate over HTTP. Each service owns its own data and routes. Authentication is centralised in `authService` using RSA keys; every other service verifies tokens by fetching the public key from a JWKS endpoint.

| Service             | Port | Purpose                                              |
|---------------------|------|------------------------------------------------------|
| `authService`       | 5001 | Issues JWTs, exposes JWKS (`/.well-known/jwks.json`) |
| `professorService`  | 5002 | CRUD for professors                                  |
| `studentService`    | 5003 | CRUD for students                                    |
| `courseService`     | 5004 | CRUD for courses, owned by professors                |
| `enrollmentService` | 5005 | Links students to courses                            |

Cross-cutting concerns:

- **Logging** — `logging.js` wraps Winston with per-service named loggers. JSON output for easy parsing.
- **Correlation IDs** — `correlationId.js` uses `cls-hooked` to tag every request with a UUID that propagates through async calls and log lines.
- **Shared constants** — `consts.js` holds all service URLs and role names.

## Authentication Flow

1. A user (student or professor) registers via the respective service.
2. They log in at `POST /api/login/student` or `/professor` on `authService`.
3. `authService` looks up the user via that service's internal endpoint, verifies the password with bcrypt, and signs a JWT (RS256) with the embedded role.
4. The JWT header includes `kid` (key id) and `jku` (URL of the JWKS endpoint).
5. The client sends the JWT as `Authorization: Bearer <token>` to any protected route.
6. The receiving service decodes the header, fetches the JWKS from `authService` (cached for 5 minutes), finds the matching public key, and verifies the signature.

Roles: `student`, `professor`, `admin`, `auth_service`, `enrollment_service`.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB Atlas cluster (or local MongoDB)
- Your current public IP added to Atlas Network Access whitelist

## Setup

### 1. Clone and install

```bash
git clone https://github.com/lavanyabadyal-blip/SAD-SRH1.git
cd SAD-SRH1
npm install
cd authService && npm install && cd ..
cd professorService && npm install && cd ..
cd studentService && npm install && cd ..
cd courseService && npm install && cd ..
cd enrollmentService && npm install && cd ..
```

### 2. Generate RSA keys for the auth service

The auth service needs an RSA key pair. From the project root:

```bash
cd authService/routes/auth/keys
openssl genrsa -out private.key 2048
openssl rsa -in private.key -pubout -out public.key
```

These files are gitignored and must never be committed.

### 3. Configure environment variables

Each service has its own `.env` file. The shape is:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=SAD-SRH1
PORT=<port>
```

- `authService/.env` — only needs `PORT=5001` (no DB).
- `studentService/.env` — `MONGO_URI` and `PORT=5003`.
- `professorService/.env` — `MONGO_URI` and `PORT=5002`.
- `courseService/.env` — `MONGO_URI` and `PORT=5004`.
- `enrollmentService/.env` — `MONGO_URI` and `PORT=5005`.

All services may safely point at the same MongoDB cluster — each Mongoose model writes to its own collection.

## Running

### Start everything

```bash
npm run start:all
```

Output is multiplexed and colour-coded per service.

### Start one service

```bash
npm run start:authService
npm run start:professorService
npm run start:studentService
npm run start:courseService
npm run start:enrollmentService
```

Stop with `Ctrl + C`.

## API Reference

All protected routes require `Authorization: Bearer <token>`. Public routes are noted.

### authService — port 5001

| Method | Path                          | Auth      | Description                          |
|--------|-------------------------------|-----------|--------------------------------------|
| POST   | `/api/login/student`          | public    | Login as a student, returns JWT      |
| POST   | `/api/login/professor`        | public    | Login as a professor, returns JWT    |
| GET    | `/.well-known/jwks.json`      | public    | Public key in JWK format             |

### studentService — port 5003

| Method | Path                       | Roles                            | Description                       |
|--------|----------------------------|----------------------------------|-----------------------------------|
| POST   | `/api/students`            | public                           | Register a new student            |
| GET    | `/api/students`            | admin, professor, enrollment     | List all students                 |
| GET    | `/api/students/:id`        | admin, professor, student (own)  | Get one student                   |
| PUT    | `/api/students/:id`        | admin, student (own)             | Update name or email              |
| DELETE | `/api/students/:id`        | admin                            | Delete a student                  |
| GET    | `/api/students/internal`   | auth_service                     | Used by authService during login  |

### professorService — port 5002

| Method | Path                         | Roles                                   | Description                       |
|--------|------------------------------|-----------------------------------------|-----------------------------------|
| POST   | `/api/professors`            | admin                                   | Create a professor                |
| GET    | `/api/professors`            | admin, professor, student, enrollment   | List all professors               |
| GET    | `/api/professors/:id`        | admin, professor (own), student         | Get one professor                 |
| PUT    | `/api/professors/:id`        | admin, professor (own)                  | Update fields                     |
| DELETE | `/api/professors/:id`        | admin                                   | Delete a professor                |
| GET    | `/api/professors/internal`   | auth_service                            | Used by authService during login  |

### courseService — port 5004

| Method | Path                  | Roles                                   | Description                          |
|--------|-----------------------|-----------------------------------------|--------------------------------------|
| POST   | `/api/courses`        | admin, professor                        | Create a course                      |
| GET    | `/api/courses`        | admin, professor, student, enrollment   | List all courses                     |
| GET    | `/api/courses/:id`    | admin, professor, student, enrollment   | Get one course                       |
| PUT    | `/api/courses/:id`    | admin, owning professor                 | Update course                        |
| DELETE | `/api/courses/:id`    | admin, owning professor                 | Delete course                        |

### enrollmentService — port 5005

| Method | Path                                | Roles                            | Description                          |
|--------|-------------------------------------|----------------------------------|--------------------------------------|
| POST   | `/api/enrollments`                  | admin, professor                 | Enroll a student in a course         |
| GET    | `/api/enrollments`                  | admin, professor                 | List all enrollments                 |
| GET    | `/api/enrollments/student/:id`      | admin, professor, student (own)  | Enrollments for one student          |
| GET    | `/api/enrollments/course/:id`       | admin, professor                 | Enrollments for one course           |
| DELETE | `/api/enrollments/:id`              | admin, professor                 | Remove an enrollment                 |

## End-to-end Example

```bash
# 1. Register a student (public)
curl -X POST http://localhost:5003/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Lavanya","email":"lavanya@example.com","password":"secret123"}'

# 2. Log in to get a JWT
curl -X POST http://localhost:5001/api/login/student \
  -H "Content-Type: application/json" \
  -d '{"email":"lavanya@example.com","password":"secret123"}'

# Response: {"access_token":"eyJhbGciOi..."}

# 3. Use the token to access own data
curl http://localhost:5003/api/students/<student_id> \
  -H "Authorization: Bearer eyJhbGciOi..."
```

## Tech Stack

- **Runtime** — Node.js, Express
- **Database** — MongoDB via Mongoose
- **Auth** — JSON Web Tokens (RS256), JWKS, bcryptjs for password hashing
- **Service-to-service** — Axios with JWT-bearer authentication
- **Logging** — Winston with JSON console transport
- **Tracing** — UUID correlation IDs via cls-hooked
- **Dev tooling** — Nodemon for hot reload, Concurrently for multi-service launch

## Project Layout

```
SMS-Template/
├── consts.js              # service URLs, role names
├── correlationId.js       # request-id middleware
├── logging.js             # per-service Winston loggers
├── package.json           # root scripts
├── authService/
│   ├── index.js
│   ├── .env
│   └── routes/auth/
│       ├── loginRoute.js
│       ├── publicKeyRoute.js
│       ├── util.js
│       └── keys/           # RSA pair — gitignored
├── studentService/
│   ├── index.js
│   ├── config/db.js
│   ├── models/student.js
│   └── routes/
│       ├── studentRoute.js
│       └── auth/util.js
├── professorService/       # mirrors studentService
├── courseService/          # mirrors studentService
└── enrollmentService/      # plus cross-service enrichment
```

## Security Notes

- **Never commit `.env` files** — they contain database credentials.
- **Never commit RSA keys** — `authService/routes/auth/keys/*.key` are gitignored. Generate fresh keys on each machine.
- **Rotate any leaked secrets immediately.** If a `.env` ever lands on a public repo, change the database password and the keys before doing anything else — git history keeps the old value forever.
- **Password hashes** are only ever exposed via the `/internal` routes, which require the `auth_service` role.

## License

ISC
