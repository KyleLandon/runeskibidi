@echo off

ECHO ---- Runeskibidi Project Setup ----

REM Install root dependencies (if package.json exists)
IF EXIST package.json (
  ECHO Installing root dependencies...
  npm install
)

REM Install client dependencies
IF EXIST client\package.json (
  ECHO Installing client dependencies...
  cd client
  npm install
  cd ..
)

REM Install server dependencies
IF EXIST server\package.json (
  ECHO Installing server dependencies...
  cd server
  npm install
  cd ..
)

ECHO -----------------------------------
ECHO Setup complete!
ECHO Remember to copy your .env files to the correct locations.
ECHO To start the client: cd client && npm run dev
ECHO To start the server: cd server && npm start (or your server script)
PAUSE 