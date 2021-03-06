const fs = require('fs');
const defaultPrefix = require('../../../config.json').prefix;
const Discord = require('discord.js');
const util = require('../../util');
const GuildConfig = require('../../GuildConfig');

class CommandHandler {
    /**
     * loaded commands
     * @type {Object}
     * @private
     */
    static #commands = this._loadCommands();

    /**
     * load commands
     * @return {Command[]}
     * @private
     */
    static _loadCommands() {
        const commands = {};
        for (const folder of fs.readdirSync(`${__dirname}/../../commands`)) {
            const dirPath = `${__dirname}/../../commands/${folder}`;
            if (!fs.lstatSync(dirPath).isDirectory() || folder === "legacy") continue;
            for (const file of fs.readdirSync(dirPath)) {
                const path = `${dirPath}/${file}`;
                if (!file.endsWith('.js') || !fs.lstatSync(path).isFile()) {
                    continue;
                }
                try {
                    const command = require(path);
                    for (const name of command.names) {
                        commands[name] = command;
                    }
                } catch (e) {
                    console.error(`Failed to load command '${file}'`, e);
                }
            }
        }
        return commands;
    }

    static getCommands() {
        return this.#commands;
    }

    /**
     *
     * @param {Object} options
     * @param {Database} options.database
     * @param {module:"discord.js".Client} options.bot
     * @param {module:"discord.js".Message} message
     * @return {Promise<void>}
     */
    static async event(options, message) {
        const name = await this.getCommandName(message);
        const Command = this.#commands[name];
        if (Command === undefined) return;

        try {
            /** @type {Command} */
            const cmd = new Command(message, options.database, options.bot, name);
            const userPerms = cmd.userHasPerms(), botPerms = cmd.botHasPerms();
            if (userPerms !== true) {
                await message.channel.send(`You are missing the following permissions to execute this command: ${userPerms.join(', ')}`)
                return;
            }
            if (botPerms !== true) {
                await message.channel.send(`I am missing the following permissions to execute this command: ${botPerms.join(', ')}`)
                return;
            }
            await cmd._loadConfigs();
            await cmd.execute();
        } catch (e) {
            let embed = new Discord.MessageEmbed({
                color: util.color.red,
                description: `An error occurred while executing that command!`
            });
            await message.channel.send(embed);
            console.error(`An error occurred while executing command ${Command.names[0]}:`,e);
        }
    }

    /**
     * get the command in this message
     * @param {module:"discord.js".Message} message
     * @return {Promise<String>}
     */
    static async getCommandName(message) {
        if (!message.guild || message.author.bot) return null;
        /** @type {GuildConfig} */
        const guild = await GuildConfig.get(/** @type {module:"discord.js".Snowflake} */ message.guild.id);
        const args = util.split(message.content,' ');
        const prefix = util.startsWithMultiple(message.content.toLowerCase(), guild.prefix.toLowerCase(), defaultPrefix.toLowerCase());
        if (!prefix) return null;

        return args[0].slice(prefix.length).toLowerCase();
    }

    /**
     * is this message a bot command
     * @param {module:"discord.js".Message} message
     * @return {Promise<boolean>}
     */
    static async isCommand(message) {
        return this.#commands[await this.getCommandName(message)] !== undefined;
    }
}

module.exports = CommandHandler;
