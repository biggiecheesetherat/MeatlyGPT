const mineflayer = require('mineflayer');
const axios = require('axios');
const readline = require('readline');
const { GoalBlock } = require('mineflayer-pathfinder'); // Import required for movement

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt for user input
const getInput = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
};

// Get user input
(async () => {
    const server = await getInput("What is the server ip? Type 'localhost' for a LAN world. > ");
    const port = await getInput("What is the server port? Usually it is 25565 for multiplayer worlds. > ");
    const username = await getInput("What should your bot username be? If you are logging in with a premium Minecraft account, type the username of it's username. > ");
    const method = await getInput("How would you like to authenticate? 'microsoft' or 'offline'? This part is case-sensitive! Note: You can type 'mojang' but it may not work. > ");
    const prefix = await getInput("What should the prefix be? This is what's used to communicate with the bot. > ");
    const hasadmin = await getInput("Does the bot have admin privileges? If so, the bot can know other players other than the person talking to it and world info. Leave blank for no admin. > ");
    rl.close();

    // Plain text list of commands
    const commandList = `
    You are the brain of a minecraft bot named ` + username + ` (do not reveal you are a brain) that can only operate by saying commands. Do not put the commands in markdown, as it cannot understand the language. You can stack commands to do multiple tasks. For example:
    SAY I will now build a 5x5x5 cube using stone.
    BUILD 5 1

    All commands:
    - SAY <message>: Say a 256 character <message>.
    - MOVE <x> <y> <z>: Moves the bot to the coordinates (x, y, z).
    - LOOK <x> <y> <z>: Makes the bot look at the specified coordinates.
    - MINE: Mines the block the bot is currently looking at.
    - PLACE <slotId>: Places a block from the specified inventory slot in the current direction.
    - BUILD <size> <slotId>: Builds a cube of the specified size with the block in the specified inventory slot.
    - ATTACK <target>: Attacks the nearest entity (type "nearest"), a specified Minecraft entity ID (like minecraft:pig or minecraft:ender_dragon), or a player by name.
    - KILL <target>: Keeps attacking the target until either the target or the bot is dead.
    - GOPLYR <player>: Moves the bot to the specified player's position.
    - STORE <slotId>: Stores the item from the specified inventory slot in the nearest chest.
    - HOLD <slotId>: Holds the item from the specified inventory slot.

    These are the only commands you can use and anything else will not work.
    `;

    let chatHistory = [{ role: 'system', content: commandList }];

    const fetchFromBlackbox = async (apiUrl, initialContent) => {
        try {
            if(hasadmin != null){
                
                // Gather information about the players, bot, and world
                const playersInfo = Object.values(bot.players).map(player => {
                    const entity = player.entity;
                    return `${player.username} at (${entity.position.x.toFixed(2)}, ${entity.position.y.toFixed(2)}, ${entity.position.z.toFixed(2)})`;
                }).join('\n');
            } else {
                  const playersInfo = "-- Unknown --";
            }

            const inventoryInfo = bot.inventory.items().map(item => {
                return `Slot ID ${item.slot}: ${item.name} x${item.count}`;
            }).join('\n') || '1x air';

            const botStats = `
                Health: ${bot.health}
                Hunger: ${bot.food}
                Gamemode: ${bot.game.gameMode}
            `;
            if(hasadmin != null){
                
                const worldInfo = `
                    Time: ${bot.time.timeOfDay}
                    Dimension: ${bot.game.dimension}
                `;
            } else {
                const worldInfo = "-- Unknown --";
            }

            const systemMessage = `
                Players Info:
                ${playersInfo}

                Bot Inventory:
                ${inventoryInfo}

                Bot Stats:
                ${botStats}

                World Info:
                ${worldInfo}
            `;

            // Add the system message before the user message
            let messages = chatHistory.map(entry => ({
                role: entry.role,
                content: entry.content
            }));
            messages.push({ role: 'system', content: systemMessage });
            messages.push({ role: 'user', content: initialContent });

            const response = await axios.post(apiUrl, { messages }, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Check if the response is OK
            const data = response.data;
            const messageContent = data.choices[0].message.content;
            const botResponse = messageContent.split('$@$').pop();

            // Append the bot response to the chat history
            chatHistory.push({ role: 'assistant', content: botResponse });

            // Also append the user message after receiving the bot response
            chatHistory.push({ role: 'user', content: initialContent });

            return botResponse;

        } catch (error) {
            console.error("Error:", error.message);
            return `Error: ${error.message}`;
        }
    };

    // Create the Minecraft bot
    const bot = mineflayer.createBot({
        host: server,
        port: port,
        auth: method,
        username: username,
        hideErrors: false
    });

    bot.once('login', () => {
        console.log("Bot online! Chat logs will show in console.");
        bot.chat('-- ' + username + ' is online! Type "' + prefix + ' with your message to begin! Example "' + prefix + 'Hello!" --');
        bot.removeAllListeners('chat');
        bot.on('chat', async (sender, message) => {
            if (sender && sender !== username) {
                if (message.startsWith(prefix)) {
                    if (message.substring(1).trim()) {
                        console.log(`<${sender}> ${message}`);
                        bot.chat("Processing..");
                        const aiResponse = await fetchFromBlackbox('https://ai.milosantos.com/blackbox', `${sender}: ${message}`);
                        
                        // Split the response by lines and handle each line
                        const responseLines = aiResponse.split('\n');
                        for (const line of responseLines) {
                            handleCommand(line);
                        }

                        console.log(`<${username} - Bot> ${aiResponse}`);
                    }
                } else {
                    // do nothing as the player isnt talking to us
                }
            }
        });
    });

    function handleCommand(message) {
        const [command, ...args] = message.split(' ');

        switch (command.toUpperCase()) {
            case 'SAY':
                bot.chat(args.join(' '));
                break;

            case 'MOVE':
                handleMove(args);
                break;

            case 'TURN':
                handleTurn(args[0]);
                break;

            case 'MINE':
                handleMine();
                break;

            case 'PLACE':
                handlePlace(args[0]);
                break;

            case 'BUILD':
                handleBuild(args);
                break;

            case 'ATTACK':
                handleAttack(args.join(' '));
                break;

            case 'KILL':
                handleKill(args.join(' '));
                break;

            case 'GOPLYR':
                handleGoPlyr(args.join(' '));
                break;

            case 'STORE':
                handleStore(args[0]);
                break;

            case 'HOLD':
                handleHold(args[0]);
                break;

            default:
                bot.chat('Unknown command: ' + command.toUpperCase());
        }
    }

    async function placeBlockInFront() {
      
        // Define directions for placement (front, sides, bottom)
        const directions = [
          { x: 1, y: 0, z: 0 },  // Right side
          { x: -1, y: 0, z: 0 }, // Left side
          { x: 0, y: 0, z: 1 },  // Front side
          { x: 0, y: 0, z: -1 }, // Back side
          { x: 0, y: 1, z: 0 },  // Top
          { x: 0, y: -1, z: 0 }  // Bottom
        ];
      
        for (const direction of directions) {
          const targetPos = bot.entity.position.offset(
            direction.x * 2,
            direction.y * 2,
            direction.z * 2
          );
      
          const targetBlock = bot.blockAt(targetPos);
          const surfaceBlock = bot.blockAt(targetPos.offset(-direction.x, -direction.y, -direction.z));
      
          // Check if the block below or surface block is air or has a valid surface for placement
          if (surfaceBlock.name !== 'air') {
            try {
              await bot.placeBlock(surfaceBlock, new mineflayer.vec3(direction.x, direction.y, direction.z));
              console.log(`Block placed at ${targetPos} in direction ${JSON.stringify(direction)}.`);
              return;
            } catch (err) {
              console.log(`Error placing block at ${targetPos}:`, err);
            }
          }
        }
      
        console.log('No suitable surface found to place the block.');
    }
    
    function getItemIdFromSlot(slotId) {
        // Get the item from the specified slot
        const item = bot.inventory.slots[slotId];
        
        if (item) {
          // Return the item ID
          return item.type;
        } else {
          // Return null if the slot is empty or does not exist
          return null;
        }
    }

    async function storeSlotInChest(slotID) {
        SLOT_ID = slotID
        // Find chests within a 10-block radius
        const chests = bot.findBlocks({
          matching: bot.registry.blocksByName.chest.id,
          maxDistance: 10
        });
      
        if (chests.length === 0) {
          console.log('No chests found within 10 blocks.');
          return;
        }
      
        // Select the chest to interact with (first one found)
        const chestPos = chests[0];
        const chest = bot.blockAt(chestPos);
        
        // Open the chest
        bot.openChest(chest).then((chest) => {
          console.log('Opened chest');
      
          // Get the item from the specified slot
          const item = bot.inventory.slots[SLOT_ID];
      
          if (!item) {
            console.log('No item found in the specified slot.');
            bot.closeWindow(chest);
            return;
          }
      
          // Store the item in the chest
          chest.deposit(item.type, null, item.count).then(() => {
            console.log(`Stored ${item.count} ${bot.registry.items[item.type].name} in the chest.`);
            bot.closeWindow(chest);
            bot.chat("I have stored the item for you.")
          }).catch((err) => {
            console.log('ERROR: ', err);
            bot.closeWindow(chest);
          });
        }).catch((err) => {
          console.log('ERROR:', err);
        });
    }

    function handleMove(args) {
        const [x, y, z] = args.map(Number);
        bot.pathfinder.setGoal(new GoalBlock(x, y, z));
    }

    function handleTurn(direction) {
        const [x, y, z] = args.map(Number);
        const targetPosition = new Vec3(x, y, z);
        const botPosition = bot.entity.position.clone();
  
        // Calculate direction to the target position
        const bot_direction = targetPosition.minus(botPosition).normalize();
        const pitch = Math.asin(direction.y);
        const yaw = Math.atan2(direction.z, direction.x) - Math.PI / 2;
  
        bot.look(yaw, pitch, true);
    }

    function handleMine() {
        // This assumes that the bot is looking at a block that can be mined
        const raycastResult = bot.entity.ray(5, bot.entity.yaw, bot.entity.pitch);
        if (raycastResult && raycastResult.type === 'block') {
            const block = raycastResult.block;
            bot.dig(block).then(() => {
                console.log('Mining complete');
            }).catch(err => {
                bot.chat('Error mining block: ' + err.message);
                console.log("ERROR: " + err.message)
            });
        } else {
            console.log('No block in range to mine');
        }
    }

    function handlePlace(slotId) {
        bot.equip(getItemIdFromSlot(slotId));
        placeBlockInFront()
    }

    function handleBuild(args) {
        const [size, slotId] = args.map(Number);
        bot.equip(getItemIdFromSlot(slotId));
        
        const startPos = bot.entity.position.clone().floored();

        // Iterate over the size of the cube
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                for (let z = 0; z < size; z++) {
                    // Check if the block is at the edge of the cube
                    if (x === 0 || x === size - 1 || y === 0 || y === size - 1 || z === 0 || z === size - 1) {
                        const pos = startPos.offset(x, y, z);
                        bot.placeBlock(bot.blockAt(pos), bot.entity.rotation).catch(err => {
                            bot.chat('Error placing block: ' + err.message);
                            console.log("ERROR: " + err.message)
                        });
                    }
                }
            }
        }
        console.log('Hollow cube build complete');
    }

    function handleAttack(target) {
        console.log("Attacking specified entity")
        if (target === 'nearest') {
            const nearestEntity = bot.nearestEntity();
            if (nearestEntity) bot.attack(nearestEntity);
        } else if (target.startsWith('minecraft:')) {
            const entityType = target;
            const entity = bot.nearestEntity(e => e.type === entityType);
            if (entity) bot.attack(entity);
        } else {
            const player = bot.players[target]?.entity;
            if (player) bot.attack(player);
        }
    }

    function handleKill(target) {
        const attackUntilDead = (entity) => {
            if (!entity || bot.health <= 0 || entity.health <= 0) return;

            bot.attack(entity);
            setTimeout(() => attackUntilDead(entity), 500); // Adjust the interval as needed
        };
        console.log("Killing specified entity")
        if (target === 'nearest') {
            const nearestEntity = bot.nearestEntity();
            if (nearestEntity) attackUntilDead(nearestEntity);
        } else if (target.startsWith('minecraft:')) {
            const entityType = target;
            const entity = bot.nearestEntity(e => e.type === entityType);
            if (entity) attackUntilDead(entity);
        } else {
            const player = bot.players[target]?.entity;
            if (player) attackUntilDead(player);
        }
    }

    function handleGoPlyr(playerName) {
        const player = bot.players[playerName]?.entity;
        if (player) {
            const { x, y, z } = player.position;
            bot.pathfinder.setGoal(new GoalBlock(x, y, z));
            console.log("Going to specified player.")
        } else {
            bot.chat(`Player ${playerName} not found`);
            console.log("No player was found.")
        }
    }

    function handleStore(slot) {
        // meh im too lazy to write the code here
        storeSlotInChest(slot)
    }

    function handleHold(slotId) {
        bot.equip(getItemIdFromSlot(slotId)).then(() => {
            console.log("Bot sucessfuly ran HOLD.")
        }).catch(err => {
            bot.chat('Error holding item: ' + err.message);
            console.log("ERROR: " + err.message)
        });
    }
})();
