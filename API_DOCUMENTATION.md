# User API Documentation

This documentation provides details about the User Management API endpoints.

## Base URL
```
/users
```

## Authentication
Most endpoints require authentication using a JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Create User
Creates a new user in the system.

**Endpoint:** `POST /users`

**Request Body:**
```json
{
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "password": "string",
    "role": "admin" | "nurse" | "pharmacist",
    "primarysite": "string",
    "assignedsites": ["string"]
}
```

**Response:**
- Status: 200 OK
- Body: Returns the created user object

**Error Responses:**
- 500 Internal Server Error: If user creation fails

### 2. Get All Users
Retrieves a list of all users.

**Endpoint:** `GET /users`

**Response:**
- Status: 200 OK
- Body: Array of user objects

**Error Responses:**
- 500 Internal Server Error: If fetching users fails

### 3. Get User by ID
Retrieves a specific user by their ID.

**Endpoint:** `GET /users/:id`

**Access:** Admin only

**Parameters:**
- `id`: User ID (number)

**Response:**
- Status: 200 OK
- Body: User object

**Error Responses:**
- 404 Not Found: If user doesn't exist
- 500 Internal Server Error: If fetching user fails

### 4. Update User
Updates an existing user's information.

**Endpoint:** `PUT /users/:id`

**Access:** Admin only

**Parameters:**
- `id`: User ID (number)

**Request Body:** (all fields optional)
```json
{
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "password": "string",
    "role": "admin" | "nurse" | "pharmacist",
    "primarysite": "string",
    "assignedsites": ["string"]
}
```

**Response:**
- Status: 200 OK
- Body: Updated user object

**Error Responses:**
- 404 Not Found: If user doesn't exist
- 500 Internal Server Error: If update fails

### 5. Delete User
Deletes a user from the system.

**Endpoint:** `DELETE /users/:id`

**Access:** Admin only

**Parameters:**
- `id`: User ID (number)

**Response:**
- Status: 200 OK
- Body: 
```json
{
    "message": "User deleted successfully"
}
```

**Error Responses:**
- 500 Internal Server Error: If deletion fails

## Data Models

### User Object Structure
```typescript
{
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: "admin" | "nurse" | "pharmacist";
    primarysite: string;
    assignedsites: string[];
}
```

## Notes
1. All requests that return errors will include an error message in the response body.
2. The API uses JWT authentication and role-based access control.
3. Most administrative operations (get by ID, update, delete) require admin privileges.
4. All dates are returned in ISO 8601 format. 