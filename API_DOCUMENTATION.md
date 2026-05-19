# Converse API Documentation

This document details all available HTTP endpoints in the Converse Backend REST API. All endpoints are prefixed with `/api` (e.g., `http://localhost:5001/api`).

---

## Global Headers & Authentication

*   **Content-Type**: `application/json`
*   **Authentication**: Session-based. The backend sets an `httpOnly`, `sameSite: "strict"`, cryptographically signed JWT session cookie named `jwt` on login/signup. Subsequent requests must automatically supply this cookie (Axios will do this automatically with `{ withCredentials: true }`).

---

## 1. Authentication Endpoints (`/api/auth`)

### Register Account
Creates a new user account, registers them on the Stream Chat API, and signs them in.
*   **Method**: `POST`
*   **Path**: `/signup`
*   **Auth Required**: No
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123",
      "fullName": "John Doe"
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "success": true,
      "user": {
        "_id": "60d5ec4b1a23c82d9c888888",
        "fullName": "John Doe",
        "email": "user@example.com",
        "profilePic": "https://avatar.iran.liara.run/public/42.png",
        "bio": "",
        "location": "",
        "friends": [],
        "isOnboarded": false,
        "createdAt": "2026-05-18T12:00:00.000Z",
        "updatedAt": "2026-05-18T12:00:00.000Z"
      }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request` (Validation Failed):
        ```json
        { "message": "All fields are required" }
        ```
    *   `400 Bad Request` (Email Exists):
        ```json
        { "message": "Email already exists, please use a diffrent one" }
        ```

---

### Log In
Verifies user credentials and establishes a signed session cookie.
*   **Method**: `POST`
*   **Path**: `/login`
*   **Auth Required**: No
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "success": true,
      "user": {
        "_id": "60d5ec4b1a23c82d9c888888",
        "fullName": "John Doe",
        "email": "user@example.com",
        "profilePic": "https://avatar.iran.liara.run/public/42.png",
        "bio": "Developer and designer",
        "location": "New York, USA",
        "friends": [],
        "isOnboarded": true
      }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: `{ "message": "All fields are required" }`
    *   `401 Unauthorized` (Wrong credentials): `{ "message": "Invalid email or password" }`

---

### Log Out
Clears the HTTP-only JWT token session cookie.
*   **Method**: `POST`
*   **Path**: `/logout`
*   **Auth Required**: No
*   **Success Response** (`200 OK`):
    ```json
    {
      "success": true,
      "message": "Logout successful"
    }
    ```

---

### Onboarding / Edit Profile
Updates the authenticated user's profile information and synchronizes details with GetStream.io.
*   **Method**: `POST`
*   **Path**: `/onboarding`
*   **Auth Required**: Yes
*   **Request Body**:
    ```json
    {
      "fullName": "John Doe",
      "bio": "Full-stack engineer and designer",
      "location": "Boston, USA",
      "profilePic": "data:image/jpeg;base64,..."
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "success": true,
      "user": {
        "_id": "60d5ec4b1a23c82d9c888888",
        "fullName": "John Doe",
        "email": "user@example.com",
        "profilePic": "data:image/jpeg;base64,...",
        "bio": "Full-stack engineer and designer",
        "location": "Boston, USA",
        "isOnboarded": true
      }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request` (Missing fields during initial onboarding):
        ```json
        {
          "message": "All fields are required",
          "missingFields": ["bio", "location"]
        }
        ```
    *   `401 Unauthorized`: `{ "message": "Unauthorized - No token provided" }`

---

### Get Authenticated User
Retrieves profile information for the current active session.
*   **Method**: `GET`
*   **Path**: `/me`
*   **Auth Required**: Yes
*   **Success Response** (`200 OK`):
    ```json
    {
      "success": true,
      "user": {
        "_id": "60d5ec4b1a23c82d9c888888",
        "fullName": "John Doe",
        "email": "user@example.com",
        "profilePic": "https://avatar.iran.liara.run/public/42.png",
        "bio": "Hello there!",
        "location": "San Francisco, USA",
        "friends": [],
        "isOnboarded": true
      }
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: `{ "message": "Unauthorized - Invalid token" }`

---

### Request Password Recovery (Forgot Password)
Generates a 6-digit verification OTP, saves its expiry time (1 hour), and transmits it via Resend.
*   **Method**: `POST`
*   **Path**: `/forgot-password`
*   **Auth Required**: No
*   **Request Body**:
    ```json
    {
      "email": "user@example.com"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Check your email for the OTP.",
      "error": false,
      "success": true,
      "otp": "452791" // Returned ONLY when NODE_ENV === "development"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request` (Email not found):
        ```json
        { "message": "Email not found", "error": true, "success": false }
        ```

---

### Verify Reset OTP
Validates the password reset OTP entered by the user.
*   **Method**: `POST`
*   **Path**: `/verify-reset-otp`
*   **Auth Required**: No
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "otp": "452791"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "OTP verified successfully.",
      "error": false,
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request` (Expired/Invalid OTP):
        ```json
        { "message": "Invalid OTP.", "error": true, "success": false }
        ```

---

### Reset Password
Sets a new hashed password for the verified recovery email.
*   **Method**: `POST`
*   **Path**: `/reset-password`
*   **Auth Required**: No
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "newPassword": "brandnewpassword123",
      "confirmPassword": "brandnewpassword123"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Password updated successfully.",
      "error": false,
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request` (Mismatch):
        ```json
        { "message": "Passwords do not match.", "error": true, "success": false }
        ```

---

## 2. User & Connections Endpoints (`/api/users`)

All User endpoints require a verified, active session cookie (`protectRoute`).

### Get Discoverable Users
Fetches all onboarded users on the system *excluding* the logged-in user and their current friends.
*   **Method**: `GET`
*   **Path**: `/`
*   **Auth Required**: Yes
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "_id": "60d5ec4b1a23c82d9c999999",
        "fullName": "Jane Smith",
        "bio": "Chatting enthusiast",
        "profilePic": "https://avatar.iran.liara.run/public/12.png",
        "location": "Paris, France",
        "isOnboarded": true
      }
    ]
    ```

---

### Get Populated Friend List
Fetches detailed profile information for all users in the authenticated user's friend array.
*   **Method**: `GET`
*   **Path**: `/friends`
*   **Auth Required**: Yes
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "_id": "60d5ec4b1a23c82d9caaaaaa",
        "fullName": "Bob Johnson",
        "bio": "Loves hiking and talking tech",
        "profilePic": "https://avatar.iran.liara.run/public/5.png",
        "location": "Denver, USA"
      }
    ]
    ```

---

### Send Friend Request
Sends a pending connection request to another discoverable user.
*   **Method**: `POST`
*   **Path**: `/friend-request/:id`
*   **Auth Required**: Yes
*   **URL Params**: `:id` - Target User's `_id`
*   **Success Response** (`201 Created`):
    ```json
    {
      "_id": "60d5ec4b1a23c82d9cbbbbbb",
      "sender": "60d5ec4b1a23c82d9c888888",
      "recipient": "60d5ec4b1a23c82d9c999999",
      "status": "pending",
      "createdAt": "2026-05-18T12:05:00.000Z",
      "updatedAt": "2026-05-18T12:05:00.000Z"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request` (Requesting self): `{ "message": "You can't send friend request to yourself" }`
    *   `400 Bad Request` (Already friends): `{ "message": "You are already friends with this user" }`

---

### Accept Friend Request
Accepts an incoming pending friend request, updating the request status and establishing a bidirectional relationship in each user's profile.
*   **Method**: `PUT`
*   **Path**: `/friend-request/:id/accept`
*   **Auth Required**: Yes
*   **URL Params**: `:id` - Pending FriendRequest `_id`
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Friend request accepted"
    }
    ```
*   **Error Responses**:
    *   `403 Forbidden` (Not target recipient): `{ "message": "You are not authorized to accept this request" }`
    *   `404 Not Found`: `{ "message": "Friend request not found" }`

---

### Get All Friend Requests
Retrieves pending incoming friend requests (with populated sender data) and recently accepted outgoing requests (with populated recipient data).
*   **Method**: `GET`
*   **Path**: `/friend-requests`
*   **Auth Required**: Yes
*   **Success Response** (`200 OK`):
    ```json
    {
      "incomingReqs": [
        {
          "_id": "60d5ec4b1a23c82d9cbbbbbb",
          "status": "pending",
          "sender": {
            "_id": "60d5ec4b1a23c82d9c999999",
            "fullName": "Jane Smith",
            "profilePic": "https://avatar.iran.liara.run/public/12.png"
          }
        }
      ],
      "acceptedReqs": [
        {
          "_id": "60d5ec4b1a23c82d9cccccc",
          "status": "accepted",
          "recipient": {
            "_id": "60d5ec4b1a23c82d9caaaaaa",
            "fullName": "Bob Johnson",
            "profilePic": "https://avatar.iran.liara.run/public/5.png"
          }
        }
      ]
    }
    ```

---

## 3. Chat & Communication Endpoints (`/api/chat`)

All Chat endpoints require a verified, active session cookie (`protectRoute`).

### Get Stream Token
Generates a cryptographically signed Client Session JWT token for the GetStream.io chat/video SDK client connection.
*   **Method**: `GET`
*   **Path**: `/token`
*   **Auth Required**: Yes
*   **Success Response** (`200 OK`):
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

---

### Get Unseen Message Group Counts
Runs a Mongo aggregation query to fetch the exact count of unread (fallback) database messages grouped by sender for the current user.
*   **Method**: `GET`
*   **Path**: `/unseen-per-user`
*   **Auth Required**: Yes
*   **Success Response** (`200 OK`):
    ```json
    {
      "60d5ec4b1a23c82d9c999999": 3,
      "60d5ec4b1a23c82d9caaaaaa": 1
    }
    ```

---

### Mark Messages as Read
Sets the read flag (`isRead: true`) on all unread database fallback messages sent from a specific user.
*   **Method**: `PUT`
*   **Path**: `/mark-read/:senderId`
*   **Auth Required**: Yes
*   **URL Params**: `:senderId` - Sender User's `_id`
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Messages marked as read"
    }
    ```
