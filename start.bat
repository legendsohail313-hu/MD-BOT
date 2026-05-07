@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting full app on http://localhost:3000
start "" http://localhost:3000
npm start
