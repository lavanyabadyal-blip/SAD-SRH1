// Shared constants used across all microservices.
// Keeping URLs and roles in one place so we do not hunt for hardcoded
// addresses when a port or path changes.

const AUTH_SERVICE = "http://localhost:5001/api/login";
const AUTH_SERVICE_JWKS = "http://localhost:5001/.well-known/jwks.json";

const PROFESSOR_SERVICE = "http://localhost:5002/api/professors";
const PROFESSOR_SERVICE_INTERNAL = "http://localhost:5002/api/professors/internal";

const STUDENT_SERVICE = "http://localhost:5003/api/students";
const STUDENT_SERVICE_INTERNAL = "http://localhost:5003/api/students/internal";

const COURSE_SERVICE = "http://localhost:5004/api/courses";
const ENROLLMENT_SERVICE = "http://localhost:5005/api/enrollments";

// Role names live here so a typo in one file does not silently lock people out.
const ROLES = Object.freeze({
  STUDENT: "student",
  PROFESSOR: "professor",
  ADMIN: "admin",
  AUTH_SERVICE: "auth_service",
  ENROLLMENT_SERVICE: "enrollment_service",
});

module.exports = {
  AUTH_SERVICE,
  AUTH_SERVICE_JWKS,
  PROFESSOR_SERVICE,
  PROFESSOR_SERVICE_INTERNAL,
  STUDENT_SERVICE,
  STUDENT_SERVICE_INTERNAL,
  COURSE_SERVICE,
  ENROLLMENT_SERVICE,
  ROLES,
};
