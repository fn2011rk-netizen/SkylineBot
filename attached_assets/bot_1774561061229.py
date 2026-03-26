import discord
import os
import json
from discord.ext import commands
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

# Set up bot with command prefix
intents = discord.Intents.none()
intents.guilds = True
intents.messages = True
intents.message_content = True
intents.reactions = True
if config.get('enable_welcome', False):
    intents.members = True  # For member join events

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

if config.get('enable_welcome', False):
    @bot.event
    async def on_member_join(member):
        channel = discord.utils.get(member.guild.channels, name=config['welcome_channel'])
        if channel:
            message = config['welcome_message'].format(user=member.mention)
            await channel.send(message)

@bot.command(name='hello')
async def hello(ctx):
    await ctx.send('Hello! I am your custom Discord bot.')

@bot.command(name='ping')
async def ping(ctx):
    await ctx.send('Pong!')

@bot.command(name='role')
async def select_role(ctx, *, role_name: str):
    if role_name in config['selectable_roles']:
        role = discord.utils.get(ctx.guild.roles, name=role_name)
        if role:
            await ctx.author.add_roles(role)
            await ctx.send(f'Rolle {role_name} wurde dir zugewiesen!')
        else:
            await ctx.send(f'Rolle {role_name} nicht gefunden.')
    else:
        await ctx.send(f'Erlaubte Rollen: {", ".join(config["selectable_roles"])}')

@bot.command(name='verify')
async def verify(ctx):
    if config['verification_enabled']:
        role = discord.utils.get(ctx.guild.roles, name=config['verified_role'])
        if role:
            await ctx.author.add_roles(role)
            await ctx.send('Du bist nun verifiziert!')
        else:
            await ctx.send('Verifizierungsrolle nicht gefunden.')
    else:
        await ctx.send('Verifizierung ist deaktiviert.')

@bot.command(name='roles')
async def list_roles(ctx):
    await ctx.send(f'Erlaubte Rollen: {", ".join(config["selectable_roles"])}')

@bot.command(name='dice')
async def dice(ctx, sides: int = 6):
    import random
    result = random.randint(1, sides)
    await ctx.send(f'🎲 Du hast eine {result} gewürfelt!')

@bot.command(name='kick')
@commands.has_permissions(kick_members=True)
async def kick(ctx, member: discord.Member, *, reason: str = "Kein Grund angegeben"):
    await member.kick(reason=reason)
    await ctx.send(f'{member} wurde gekickt. Grund: {reason}')

@bot.command(name='ban')
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason: str = "Kein Grund angegeben"):
    await member.ban(reason=reason)
    await ctx.send(f'{member} wurde gebannt. Grund: {reason}')

@bot.command(name='clear')
@commands.has_permissions(manage_messages=True)
async def clear(ctx, amount: int = 5):
    await ctx.channel.purge(limit=amount + 1)
    await ctx.send(f'{amount} Nachrichten gelöscht.', delete_after=5)

# Add more custom commands here

# Run the bot
print(f"intents.members: {intents.members}")
print(f"intents.presences: {intents.presences}")
if TOKEN and TOKEN != 'MTQ4NTc2NzMzMDM5ODIwODAzMQ.GuOnhf.Qqmfx6T5GbO6klJVbrHDRsiSbvn5JGfQh6qEng':
    bot.run(TOKEN)
else:
    print("Error: DISCORD_TOKEN not found or not set in .env file. Please add your bot token.")