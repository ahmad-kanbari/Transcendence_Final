# How to Run the TypeScript Ping Pong Game Application

The application has been successfully built and is currently running. Here's how to run this TypeScript application:

## Method 1: Using Webpack Dev Server
1. First, make sure you have all dependencies installed:
   ```
   npm install
   ```

2. To build the application:
   ```
   npm run build
   ```
   This compiles all TypeScript files and creates a bundle.js file in the dist directory.

3. To start the development server:
   ```
   npm start
   ```
   This will start the webpack development server on port 3000.

4. Access the application by navigating to:
   ```
   http://localhost:3000
   ```

## Method 2: Using the Custom Server
1. After building the application with `npm run build`, you can run the custom server:
   ```
   node open_app.js
   ```
   This will start a server on port 3001.

2. Access the application by navigating to:
   ```
   http://localhost:3001
   ```

## Application Features
- The application is a Ping Pong game with modern styling and features
- It includes multiple pages: Home, Game, Login, Profile, etc.
- It has authentication functionality with login and registration
- The game supports both player vs player and player vs AI modes
- User profiles track game statistics like wins, losses, and win rate

I've fixed the path issues that were preventing the application from loading correctly by:
1. Changing the TypeScript entry point in webpack.config.js from 'src/js/app.ts' to 'src/ts/app.ts'
2. Updating the HTML file to use the compiled bundle.js instead of the TypeScript file directly
3. Fixing the page loading paths in constants.ts to use relative paths instead of absolute paths

The application is now fully functional and running at http://localhost:3001