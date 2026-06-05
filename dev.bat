@echo off
set NODE_ENV=development
start /b cmd /c npx vite --port 5174
call npx wait-on http://localhost:5174
call npx electron .
