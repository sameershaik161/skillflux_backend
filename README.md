# SkillFlux Backend API

Backend server for SkillFlux - Student Achievement Management System

## Features

- 🎓 Student & Admin Authentication
- 🏆 Achievement Management with AI Analysis
- 📊 ERP (Educational Resource Planning) System
- 📢 Announcements & Notifications
- 🤖 Google Gemini AI Integration for Certificate Analysis
- 📁 File Upload Handling

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **AI:** Google Gemini AI
- **Authentication:** JWT (JSON Web Tokens)
- **File Uploads:** Multer

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Then update the `.env` file with your actual values:

   ```env
   # MongoDB Connection
   MONGO_URI=mongodb://localhost:27017/skillflux

   # JWT Secrets (Change these to your own secure values)
   JWT_SECRET=your-student-jwt-secret-key-here
   ADMIN_JWT_SECRET=your-admin-jwt-secret-key-here

   # Server Port
   PORT=5000

   # Google Gemini AI API Key (REQUIRED for AI Certificate Analysis)
   GEMINI_API_KEY=your-gemini-api-key-here

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173

   # Environment
   NODE_ENV=development
   ```

3. **Database Setup**
   
   Make sure MongoDB is running on your system:
   ```bash
   # For Windows (if installed as service)
   net start MongoDB

   # For macOS/Linux
   sudo systemctl start mongod
   ```

4. **Run the Server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /auth/register` - Student registration
- `POST /auth/login` - Student login
- `POST /auth/admin/login` - Admin login

### Achievements
- `POST /achievements/add` - Submit achievement (Student)
- `GET /achievements/my-achievements` - Get student's achievements
- `GET /admin/achievements` - Get all achievements (Admin)
- `PUT /admin/achievements/:id/verify` - Approve/Reject achievement (Admin)
- `POST /admin/analyze-certificate` - AI-powered certificate analysis (Admin)

### ERP
- `POST /erp/submit` - Submit/Update ERP (Student)
- `GET /erp/my-erp` - Get student's ERP
- `GET /erp/admin/all` - Get all ERPs (Admin)
- `PUT /erp/admin/:id/verify` - Verify/Reject ERP (Admin)

### Students
- `GET /admin/students` - Get all students (Admin)
- `GET /admin/students/:id` - Get student details (Admin)

### Analytics
- `GET /admin/analytics` - Get dashboard statistics (Admin)
- `GET /admin/dashboard-stats` - Get detailed dashboard stats (Admin)

## AI Certificate Analysis

The backend uses **Google Gemini AI** to analyze student achievement certificates and provide:

- Credibility score (0-100)
- Recommended points to award
- Key highlights and skills identified
- Red flags or concerns
- Confidence level assessment

### Setting up Gemini AI

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSyCieBnCDbFqeGJvv5Ub5j0gTRFegrNM4yI
   ```
3. The AI analysis will automatically work when admins click "AI Analyze Certificate" button

## File Uploads

Uploaded files (certificates, profile pictures, resumes) are stored in the `uploads/` directory:
- `uploads/achievements/` - Achievement certificates
- `uploads/profiles/` - Profile pictures
- `uploads/resumes/` - Student resumes
- `uploads/erps/` - ERP related documents

**Note:** The `uploads/` folder is gitignored and should not be committed to version control.

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Environment variables for sensitive data
- CORS protection
- Input validation with Joi

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed-admin` - Create default admin account (if available)

## Project Structure

```
backend/
├── src/
│   ├── models/          # Mongoose schemas
│   ├── controllers/     # Route controllers
│   ├── routes/          # Express routes
│   ├── middleware/      # Custom middleware
│   └── utils/           # Utility functions
├── uploads/             # File uploads (gitignored)
├── config/              # Configuration files
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
├── server.js            # Entry point
└── package.json         # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
