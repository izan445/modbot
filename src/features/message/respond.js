const AutoResponse = require('../../AutoResponse');
const legacyCommands = require('./legacyCommands');
const newCommands = require('./commands');

exports.event = async (options, message) => {
  if (!message.guild || message.author.bot  || await legacyCommands.getCommand(message) !== null || await newCommands.isCommand(message)) return;
  const triggered = [];

  const responses = await AutoResponse.get(message.channel.id, message.guild.id);
  for (let [,response] of responses) {
    if (response.matches(message)) {
      triggered.push(response.response);
    }
  }

  if (triggered.length) {
    await message.channel.send(triggered[Math.floor(Math.random() * triggered.length)]);
  }
};
