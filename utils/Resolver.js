/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License  
    The Resolver contains all functions parsing and collecting information */

//require packages
const mysql = require('mysql');
const { MessageMentions: { USERS_PATTERN, CHANNELS_PATTERN, ROLES_PATTERN }, Collection } = require('discord.js');
const { convertSnowflake } = require('./functions');

module.exports = {

    /** Get the user from mention
     * @param {Collection} client
     * @param {String} mention 
     * @returns 
     */
    async getUserFromMention(client, mention) {
        if (!mention) return;

        // The id is the first and only match found by the RegEx.
        const matches = mention.match(USERS_PATTERN);

        // If supplied variable was not a mention, matches will be null instead of an array.
        if (!matches) return;

        // The first element in the matches array will be the entire mention, not just the ID,
        // so use index 1.
        const id = matches[1];

        return client.users.cache.get(id);
    },

    /** Get user information from input
     * @param {Collection} guild 
     * @param {String} input 
     * @returns 
     */
    async getUserFromInput(guild, input) {
        if (!input) return;

        let member //setup member value

        //filter input [1]
        let mention = new RegExp('<@!?([0-9]+)>', 'g').exec(input)
        let item = mention != null ? mention[1] : input.trim()

        //filter input [2]
        let filter = mysql.escape(item.replace(',', ''))
        let filter_item = filter.substring(1).slice(0, -1).trim()

        //get user by id
        if (filter_item.match(/^[0-9]+$/)) {
            member = await guild.members.cache.get(filter_item) //get user straight from member cache
            if (!member) { member = await guild.members.cache.find(member => member.id == filter_item) } //find user in member cache
            else if (!member) { member = await guild.members.fetch(filter_item); } //fetch member straight from guild
            //if member is found (by id) return member
            if (member) return member;
        }

        //get user by username#discriminator
        if (filter_item.indexOf('#') > -1) {
            let [name, discrim] = filter_item.split('#') //split the into username and (#) discriminator
            member = await guild.members.cache.find(u => u.user.username === name && u.user.discriminator === discrim);
            //if member is found (by username and discriminator) return member
            if (member) return member;
        }

        //if member value is still empty, return false
        if (!member) return false;

    },

    /** Get role information from input
     * @param {Collection} guild 
     * @param {String} input 
     * @param {Integer} flag 
     */
    async getRolesFromInput(guild, input, flag) {
        if (!input) return;

        //create return array
        let array_id = []

        //handle input (Array)
        let input_string = Array.isArray(input) ? input.toString() : input
        let input_array = input_string.split(',')

        //go through every input
        input_array.forEach(role => {

            //filter input [1]
            let mention = new RegExp('<@&([0-9]+)>', 'g').exec(role)
            let item = mention != null ? mention[1] : role.trim()

            //filter input [2]
            let filter = mysql.escape(item.replace(',', ''))
            let filter_item = filter.substring(1).slice(0, -1).trim()

            //get role information
            let targetRole = filter_item.match(/^[0-9]+$/) != null ? guild.roles.cache.get(filter_item) : guild.roles.cache.find(role => role.name.toLowerCase() == filter_item.toLowerCase())

            //check what flag is present
            switch (flag) {
                case "tag": //if user asked for rp;e ids, return role ids
                    if (targetRole) array_id.push(`<@&${targetRole.id}>`)
                    break;
                case "name": //if user asked for role names, return role names
                    if (targetRole) array_id.push(targetRole.name)
                    break;
                case "all": //if user requests all role information
                    if (targetRole) array_id.push(targetRole)
                    break;
                default:
                    if (targetRole) array_id.push(targetRole.id)
            }

        });

        //check if any result and return
        if (array_id.length >= 1) return array_id
        else return false

    },

    /** Get user X amount of user messages
     * @param {*} message 
     * @param {*} member 
     * @param {*} limit 
     * @returns 
     */
    async getUserMessages(message, member, limit) {

        //setup the message collection
        let messageCollection = new Collection;

        //get last message from channel
        var LastMessage = await message.channel.messages.fetch({ limit: 1, force: true });
        LastMessage = ([...LastMessage.values()].length > 0) ? [...LastMessage.values()][0] : null

        //keep fetching messages, till collection is full or last message is null
        while (messageCollection.size < limit) {

            //collect messages in chunks of 50
            const options = { before: LastMessage.id, limit: 50 } //set filter options
            var FetchMessages = await message.channel.messages.fetch(options); //collect messages from target channel
            if (member != undefined) FetchMessages.sweep(message => message.author.id != member.user.id); //remove messages not from target member

            //filter messages for NOT older than two weeks and within limit
            await FetchMessages.map(message => {
                if (OlderThanTwoWeeks(message.createdTimestamp) == false &&
                    messageCollection.size < limit) messageCollection.set(message.id, message);
            })

            //set last message for further loop
            LastMessage = ([...FetchMessages.last(1)].length > 0) ? [...FetchMessages.last(1)][0] : null
            if (LastMessage === null) break; //if there is no last message, break
            if (OlderThanTwoWeeks(LastMessage.createdTimestamp) == true) break; //if last message is older than 2 weeks, break

        }

        //return collection
        return messageCollection;

        //small function to check if message timestamp is older than two weeks or not
        function OlderThanTwoWeeks(timestamp) {
            //setup the times 
            const now = +new Date()
            const messageTime = +new Date((timestamp))
            const TwoWeeks = 14 * 60 * 60 * 24 * 1000

            //return true or false
            return (now - messageTime) > TwoWeeks
        }
    },

    /** /get input type for purge
     * @param {*} guild 
     * @param {*} input 
     * @returns 
     */
    async inputType(guild, input) {

        //create return array
        let typeArray = { "member": false, "amount": null }

        //handle input (Array)
        let input_string = Array.isArray(input) ? input.toString() : input
        let input_array = input_string.split(',')

        //await for the loop to finish
        await input_array.forEach(async item => {
            if (item.length > 10) {
                const target = await module.exports.getUserFromInput(guild, item) //get member value
                typeArray.member = target //set member value
            }
            if (item.length < 5) {
                typeArray.amount = item  //set amount value
            }
        });

        return typeArray //return to outcome
    }

}