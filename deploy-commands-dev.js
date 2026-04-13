// Deploy commands script for development (works with TypeScript files)
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Load TypeScript command files directly
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.includes('.backup'));

console.log(`Found ${commandFiles.length} command files`);

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);

  // Use require for TypeScript files (ts-node handles this)
  require('ts-node/register');
  const command = require(filePath);
  const commandModule = command.default || command;

  if (commandModule.data && commandModule.execute) {
    commands.push(commandModule.data.toJSON());
    console.log(`✅ Loaded command: ${commandModule.data.name}`);
  } else {
    console.log(`❌ Failed to load: ${file}`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\nStarted deploying ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log(`✅ Successfully deployed ${data.length} application (/) commands.`);
    console.log('\nDeployed commands:');
    data.forEach((cmd) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
    process.exit(1);
  }
})();
