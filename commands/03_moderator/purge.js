/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License
    For more information on the commands, please visit hyperbot.cc  */

const { createHyperLog } = require("../../utils/AuditManager");
const { ReplyErrorMessage, SendModerationActionMessage } = require("../../utils/MessageManager");
const { getModuleSettings } = require("../../utils/PermissionManager");
const { inputType, getUserMessages } = require("../../utils/Resolver")

//construct the command and export
module.exports.run = async (client, message, arguments, prefix, permissions) => {

    //divide the input {amount, user}
    const { amount, member } = input = await inputType(message.guild, arguments.slice(0, 2))

    //if any of two not provide, return error
    if (amount == null) return ReplyErrorMessage(message, 'Amount was not provied', 4800);
    if (member == false) return ReplyErrorMessage(message, '@user was not found', 4800);

    //check if target is moderator
    // if (member.permissions.has('KICK_MEMBERS')) return ReplyErrorMessage(message, '@user is a moderator', 4800);

    //check and parse amount/limit
    const limit = parseInt(amount)
    if (isNaN(limit)) return ReplyErrorMessage(message, `Doesn't seem to be a valid number`, 4800)
    if (limit > 100 || limit < 2) return ReplyErrorMessage(message, `Provide an amount between 1 and 100`, 4800)

    //get the message collection (limit 100)
    let collection = await getUserMessages(message, member, limit)

    //check if collection hold messages
    if (collection.size > 0) {
        //try and delete collection
        try { await message.channel.bulkDelete(collection, true); }
        catch (err) { return ReplyErrorMessage(message, `An Error occured, could not delete ${collection.size} messages`, 4800) }
    } else {
        return ReplyErrorMessage(message, `Could not find any messages to delete`, 4800)
    }

    //delete message and verify that the messages have been deleted
    setTimeout(() => message.delete(), 4800); //delete command-message
    // message.reply(`**${collection.size}** messages have been deleted`);

    //save log to database and log event
    await createHyperLog(message, 'purge', null, member, `purged ${collection.size} messages`);
    //get module settings, proceed if true
    const moderationAction = await getModuleSettings(message.guild, 'moderationAction');
    if (moderationAction.state === 1 && moderationAction.channel != null) {
        return SendModerationActionMessage(message, module.exports.info.name, moderationAction.channel)
    }
    return;
}


//command information
module.exports.info = {
    name: 'purge',
    alias: ['delete'],
    category: 'moderation',
    desc: 'Removes X messages from target member',
    usage: '{prefix}purge @user [amount]',
}

//slash setup
module.exports.slash = {
    slash: false,
    options: [{
        name: 'user',
        type: 'USER',
        description: 'Mention target user',
        required: true,
    },
    {
        name: 'amount',
        type: 'NUMBER',
        description: 'Amount of messages',
        required: true,
    }]
}