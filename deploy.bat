@echo off
REM Arconet Local Deploy Script
REM Run this to deploy the latest code from git

echo ==========================================
echo Arconet Deploy - %date% %time%
echo ==========================================

cd /d C:\arconet\app

REM Run the PowerShell deploy script
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\arconet\app\deploy.ps1"

if %errorlevel% neq 0 (
    echo.
    echo DEPLOY FAILED!
    echo Check C:\arconet\deploy.log for details
    exit /b 1
)

echo.
echo DEPLOY SUCCESSFUL!
echo Site should be updated at http://localhost:3000
echo ==========================================