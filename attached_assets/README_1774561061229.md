# Custom Discord Bot

A simple Discord bot built with discord.py.

## Setup

1. Create a new Discord application at https://discord.com/developers/applications
2. Go to the "Bot" section and create a bot.
3. Copy the bot token and paste it into the `.env` file, replacing `YOUR_BOT_TOKEN_HERE`.
4. If you want welcome messages, enable "Server Members Intent" in the Privileged Gateway Intents. If you can't enable it (bot in 100+ servers), set `"enable_welcome": true` in `config.json` and verify your bot application.
5. Invite the bot to your server using the OAuth2 URL generator in the developer portal (with bot and message content intent permissions).

## Verification

If your bot is in 100+ servers or you want to use privileged intents, you need to verify your bot:
- Add a profile picture and description to your application.
- Go to the "Verification" tab and submit the form.
- Discord will review it (can take time).

Alternatively, disable welcome messages by setting `"enable_welcome": false` in `config.json`.

## Installation

Install the required packages:

```
pip install -r requirements.txt
```

## Running the Bot

Run the bot with:
```
python bot.py
```

For 24/7 operation on your local machine, use the batch file:
```
run_bot.bat
```
This will automatically restart the bot if it crashes.

For true 24/7 hosting, consider deploying to a cloud service like Heroku, Railway, or a VPS.

## Commands

- `!hello` - Greets the user
- `!ping` - Responds with "Pong!"
- `!role <role_name>` - Assigns a selectable role to yourself
- `!roles` - Lists available selectable roles
- `!verify` - Assigns the verified role
- `!dice [sides]` - Rolls a dice (default 6 sides)
- `!kick <user> [reason]` - Kicks a user (requires kick permissions)
- `!ban <user> [reason]` - Bans a user (requires ban permissions)
- `!clear [amount]` - Clears messages (requires manage messages permissions)

## Configuration

Edit `config.json` to customize:
- `welcome_channel`: Channel name for welcome messages
- `welcome_message`: Welcome message template (use {user} for mention)
- `verified_role`: Name of the verified role
- `selectable_roles`: List of roles users can assign themselves
- `verification_enabled`: Enable/disable verification
- `log_channel`: Channel for logging (not implemented yet)

## Troubleshooting

- Make sure your bot token is correct and has the necessary permissions.
- Ensure the bot has the "Message Content Intent" enabled in the developer portal.
- Check that Python and discord.py are installed correctly.