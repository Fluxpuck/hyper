/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License  
    This event is triggers by Discord and does processing of data  */

//load required modules
const { join } = require('path');
const commandFolder = join(__dirname, '..', 'commands');

//require Managers
const ClientConsole = require('../utils/ConsoleManager');
const ClientManager = require('../utils/ClientManager');

//exports "ready" event
module.exports = async (client) => {

    //find all client commandfiles
    async function fileLoader(fullFilePath) {
        if (fullFilePath.endsWith(".js")) {
            let props = require(fullFilePath)
            client.commands.set(props.info.name, props)
        }
    }

    //get and initialize client commands
    await ClientManager.getClientCommands(commandFolder, { dealerFunction: fileLoader })

    //get and initialize interactive commands  
    //SLASH COMMANDS!!

    //get and initialize per guild permissions
    //INITIALIZE PERMISSIONS (PREFIX, COMMAND PERMISSIONS, ETC.)!!

    //set client activity
    await ClientManager.setClientActivity(client);

    //finalize with the Console Messages
    ClientConsole.WelcomeMessage();
    ClientConsole.EventMessage(client.events);
    ClientConsole.CommandMessage(client.commands);

}