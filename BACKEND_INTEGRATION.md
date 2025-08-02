# SafaCycle Backend Integration

This document outlines the backend integration for the SafaCycle Smart Waste Management App.

## 🏗️ Backend Architecture

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: express-validator

### Port Configuration
- **Backend API**: Port 5001
- **Frontend (Expo)**: Port 8081
- **MongoDB**: Port 27017 (default)

## 📁 Project Structure

```
SafaCycle-main/
├── backend/                    # Backend API server
│   ├── models/                # Database models
│   │   └── User.js           # User model with authentication
│   ├── routes/               # API routes
│   │   ├── auth.js          # Authentication routes
│   │   └── users.js         # User management routes
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js          # Authentication middleware
│   │   └── validation.js    # Input validation middleware
│   ├── server.js            # Main server file
│   ├── package.json         # Backend dependencies
│   └── .env                 # Environment variables
├── src/
│   ├── services/            # API service layer
│   │   ├── apiService.js    # Base API service
│   │   ├── authService.js   # Authentication service
│   │   ├── userService.js   # User management service
│   │   └── index.js         # Service exports
│   ├── context/
│   │   └── AuthContext.js   # Updated with backend integration
│   └── screens/
│       ├── LoginScreen.js   # Updated with backend auth
│       └── SignupScreen.js  # Updated with backend auth
└── start-dev.sh             # Development startup script
```

## 🔐 Authentication System

### User Model Features
- **Roles**: admin, driver, customer
- **Status**: active, inactive, suspended
- **Security**: Password hashing, login attempts tracking, account locking
- **Profile**: Comprehensive user profiles with role-specific fields
- **Validation**: Email, password strength, phone number validation

### Authentication Flow
1. **Registration**: User creates account with role selection
2. **Login**: Email/password authentication with JWT token generation
3. **Authorization**: Role-based access control for different features
4. **Token Storage**: Secure token storage using AsyncStorage
5. **Session Management**: Automatic token refresh and validation

## 🛠️ API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /logout` - Logout user
- `DELETE /account` - Delete user account

### User Management Routes (`/api/users`) - Admin Only
- `GET /` - Get all users with pagination and filtering
- `GET /stats` - Get user statistics
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user (soft delete)
- `PUT /:id/status` - Update user status
- `PUT /:id/role` - Update user role
- `POST /bulk-update` - Bulk update users

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/safacycle
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (v16 or higher)
2. **MongoDB** (running locally or MongoDB Atlas)
3. **Expo CLI** (for React Native development)

### Installation & Setup

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Start MongoDB**
   ```bash
   # macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # Ubuntu/Linux
   sudo systemctl start mongod
   ```

3. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

4. **Install Frontend Dependencies**
   ```bash
   # From project root
   npm install
   ```

5. **Start Development Environment**
   ```bash
   # Option 1: Use the startup script
   ./start-dev.sh
   
   # Option 2: Start services separately
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   npm start
   ```

### API Testing

Test the backend API health:
```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "SafaCycle Backend API is running",
  "timestamp": "2025-07-31T16:03:32.443Z",
  "environment": "development",
  "port": "5001"
}
```

## 🔒 Security Features

### Authentication Security
- Password hashing with bcryptjs (12 rounds)
- JWT token-based authentication
- Account lockout after 5 failed login attempts
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization

### API Security
- CORS configuration
- Helmet.js for security headers
- Request body size limits
- Environment-based configuration
- Secure password reset tokens

## 📱 Frontend Integration

### AuthContext Updates
- AsyncStorage for token persistence
- Automatic token validation on app start
- Role-based navigation
- Error handling and user feedback

### Service Layer
- **apiService**: Base HTTP client with authentication
- **authService**: Authentication operations
- **userService**: User management operations (admin)

### Screen Updates
- **LoginScreen**: Backend authentication integration
- **SignupScreen**: User registration with backend
- **UserManagementScreen**: Admin user management with backend

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```
   Solution: Ensure MongoDB is running
   macOS: brew services start mongodb/brew/mongodb-community
   ```

2. **Permission Denied (npm install)**
   ```
   Solution: Use sudo or fix npm permissions
   sudo npm install
   ```

3. **Port Already in Use**
   ```
   Solution: Kill process using the port
   lsof -ti:5001 | xargs kill -9
   ```

4. **Network Request Failed**
   ```
   Solution: Check if backend is running on port 5001
   curl http://localhost:5001/health
   ```

## 🔄 Development Workflow

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `npm start`
3. **Test Authentication**: Use login/signup screens
4. **Admin Functions**: Login as admin to test user management
5. **API Testing**: Use curl or Postman for direct API testing

## 📈 Next Steps

The backend foundation is now ready for:
1. Driver management features
2. Route optimization
3. Waste collection tracking
4. Analytics and reporting
5. Machine learning integration

## 🎯 Current Status

✅ **Completed:**
- Backend server setup with Express.js
- MongoDB integration with User model
- JWT authentication system
- User registration and login
- Role-based authorization
- Frontend-backend integration
- Admin user management

🔄 **Next Phase:**
- Driver and vehicle management
- Route management system
- Collection tracking
- Analytics dashboard
- ML waste classification
