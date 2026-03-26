@echo off
:loop
echo Starting Discord Bot...
C:/Users/fn201/AppData/Local/Microsoft/WindowsApps/python3.13.exe bot.py
echo Bot crashed or stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak > nul
goto loop