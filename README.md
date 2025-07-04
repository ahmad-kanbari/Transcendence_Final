# ft_transcendence

A modern, cyberpunk-themed Pong game implementation featuring real-time multiplayer capabilities, AI opponents, tournaments, and comprehensive user management.

## 🎮 Features

- **Multiple Game Modes**: 1v1, Player vs AI, Multiplayer (4 players), Tournament mode
- **Real-time Multiplayer**: Play against other players online
- **AI Opponents**: Three difficulty levels with intelligent ball prediction
- **Tournament System**: Bracket-style tournaments with match tracking
- **User Management**: Registration, authentication, profiles, and match history
- **Two-Factor Authentication**: Enhanced security with TOTP
- **Live Chat**: Real-time messaging between players
- **Multiple Languages**: English, Arabic, and Turkish support
- **Accessibility Features**: High contrast mode, text scaling, keyboard navigation
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

### Frontend
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **Single Page Application** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Localization System** - Multi-language support

### Backend
- **Fastify** - Fast and efficient Node.js web framework
- **SQLite** - Lightweight SQL database
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - JSON Web Token authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ft_transcendence.git
cd ft_transcendence
```

### 2. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

#### Backend Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="./database.sqlite"

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:8080

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback

# Session Secret
SESSION_SECRET=your_session_secret_here
```

#### Start the Backend Server

```bash

npm run start
```

The backend server will start on `http://localhost:3000`

### 3. Setup Frontend

Open a new terminal window:

```bash
# Navigate to frontend directory (assuming it's in the root or a frontend folder)
cd frontend  # or stay in root if frontend files are there

# Install dependencies
npm install

# Install TypeScript globally (if not already installed)
npm install -g typescript

# Compile TypeScript files
npm run build

# Or use development mode with watch
npm run start
```

#### Frontend Package.json Scripts

Ensure your `package.json` includes these scripts:

```json
{
  "scripts": {
    "build": "tsc && webpack --mode=production",
    "dev": "concurrently \"tsc --watch\" \"webpack --mode=development --watch\"",
    "serve": "http-server dist -p 8080",
    "start": "npm run build && npm run serve"
  }
}
```

#### Start the Frontend Development Server

```bash
# Start development server with hot reload
npm run dev

# In another terminal, serve the files
npm run serve
```

The frontend will be available at `http://localhost:8080`

## 🐳 Docker Setup (Alternative)

If you prefer using Docker:

### Backend Docker

```bash
cd backend

# Build the Docker image
docker build -t transcendence-backend .

# Run the container
docker run -p 3000:3000 --env-file .env transcendence-backend
```

### Frontend Docker

```bash
cd frontend

# Build the Docker image
docker build -t transcendence-frontend .

# Run the container
docker run -p 8080:80 transcendence-frontend
```

### Docker Compose

For running both services together:

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=./database.sqlite
    volumes:
      - ./backend/database.sqlite:/app/database.sqlite

  frontend:
    build: ./frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
```

```bash
# Start both services
docker-compose up -d
```

## 📁 Project Structure

```
ft_transcendence/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.js
│   ├── database.sqlite
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── ts/
│   │   ├── css/
│   │   ├── pages/
│   │   ├── locales/
│   │   └── assets/
│   ├── dist/
│   ├── index.html
│   ├── package.json
│   └── webpack.config.js
└── README.md
```

## 🎯 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/auth/google/login` - Google OAuth login

### Users
- `GET /api/v1/users/showUser` - Get current user profile
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID

### Games
- `POST /api/v1/matches` - Create a new match
- `POST /api/v1/matches/:id/submit` - Submit match results
- `POST /api/v1/tournaments` - Create tournament
- `POST /api/v1/tournaments/:id/matches` - Create tournament match

### Chat
- `GET /api/v1/chat/messages` - Get chat messages
- `POST /api/v1/chat/messages` - Send chat message

## 🎮 Game Controls

### Standard Mode (1v1, vs AI)
- **Player 1**: `W` (up), `S` (down)
- **Player 2**: `↑` (up), `↓` (down)

### Multiplayer Mode (4 players)
- **Player 1**: `W` (up), `S` (down)
- **Player 2**: `↑` (up), `↓` (down)
- **Player 3**: `E` (up), `D` (down)
- **Player 4**: `I` (up), `K` (down)

### General Controls
- **Escape**: Return to menu
- **Any key**: Start game (when prompted)

## 🌐 Accessibility Features

- **High Contrast Mode**: Toggle with accessibility panel
- **Text Scaling**: Small, Medium, Large text options
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Multiple Languages**: English, Arabic (RTL), Turkish

## 🔧 Development

### Frontend Development

```bash
# Install dependencies
npm install

# Start TypeScript compiler in watch mode
npx tsc --watch

# Start webpack dev server
npm run dev

# Build for production
npm run build
```

### Backend Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Run tests
npm test

# Check code style
npm run lint
```

### Database Setup

The backend automatically creates the SQLite database on first run. To reset the database:

```bash
cd backend
rm database.sqlite
npm start  # Will recreate the database
```

## 🚀 Deployment

### Production Build

```bash
# Backend
cd backend
npm install --production
npm start

# Frontend
cd frontend
npm run build
# Serve the dist/ folder with a web server
```

### Environment Variables for Production

Update your `.env` file for production:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=your_production_jwt_secret
# ... other production configurations
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **TypeScript compilation errors**
   ```bash
   # Clean and rebuild
   rm -rf dist/
   npm run build
   ```

3. **Database connection issues**
   ```bash
   # Check if database file exists and has proper permissions
   ls -la backend/database.sqlite
   ```

4. **CORS errors**
   - Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
   - Check that backend is running before starting frontend

### Performance Optimization

- Use `npm run build` for production builds
- Enable gzip compression on your web server
- Consider using a CDN for static assets

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is part of the 42 School curriculum - ft_transcendence project.

## 🙏 Acknowledgments

- 42 School for the project specifications
- The Pong game creators for the original concept
- Socket.IO team for real-time communication capabilities
- Tailwind CSS for the styling framework

---

For more detailed information about specific features or troubleshooting, please check the inline code documentation or create an issue in the repository.