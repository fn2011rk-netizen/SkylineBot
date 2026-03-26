# Replit Hosting Guide for Discord Bot

## Steps to Host on Replit

1. **Create Repl:**
   - Gehe zu https://replit.com
   - Klicke "Create Repl"
   - Wähle "Python" als Sprache
   - Gib einen Namen ein

2. **Upload Files:**
   - Lade `bot.py`, `config.json`, `requirements.txt` hoch
   - Erstelle keine `.env` Datei

3. **Set Environment Variable:**
   - Klicke auf "Tools" > "Secrets" (oder das Schlüsselsymbol)
   - Füge hinzu: Key: `DISCORD_TOKEN`, Value: dein Bot Token
   - Speichere

4. **Install Dependencies:**
   - Replit installiert automatisch aus `requirements.txt`
   - Falls nicht, führe `pip install -r requirements.txt` in der Console aus

5. **Run the Bot:**
   - Klicke "Run" oder führe `python bot.py` in der Console aus

6. **Keep Alive:**
   - Für kostenloses Always-On: Verwende UptimeRobot (https://uptimerobot.com) um die Repl URL zu pingen
   - Oder upgrade auf Replit's paid plan für Always-On

## Troubleshooting

- **Bot startet nicht:** Prüfe Token in Secrets
- **Commands funktionieren nicht:** Stelle sicher, dass der Bot "Message Content Intent" im Portal hat und die Berechtigung im Server
- **Fehler in Console:** Teile den Fehler mit

## Replit Console Commands
- `python bot.py` - Bot starten
- `kill 1` - Bot stoppen