const tmi = require('tmi.js');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

const { channel, channel2, username, password, emailConfig } = require('./settings.json');

const db = new sqlite3.Database('./DB/points.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados de pontos.');
});

const dbCommands = new sqlite3.Database('./DB/comandos_chat.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados de comandos personalizados.');
});

const dbCount = new sqlite3.Database('./DB/counter.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados do contador.');
});

dbCount.run(`CREATE TABLE IF NOT EXISTS counter (
  id INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0
)`);

db.run(`CREATE TABLE IF NOT EXISTS pontos (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  pontos INTEGER DEFAULT 0
)`);

dbCommands.run(`CREATE TABLE IF NOT EXISTS comandos_chat (
  id INTEGER PRIMARY KEY,
  comando TEXT NOT NULL UNIQUE,
  resposta TEXT NOT NULL
)`);

const customCommands = new Map();

const options = {
    options: { debug: true },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username,
        password
    },
    channels: [channel, channel2]
};

let lastMessageTimestamp = {};
const DEBOUNCE_TIME = 2000;

const client = new tmi.Client(options);
client.connect().catch(console.error);

function sendMessageWithDelay(channel, message) {
    const now = Date.now();
    if (!lastMessageTimestamp[channel] || now - lastMessageTimestamp[channel] >= DEBOUNCE_TIME) {
        client.say(channel, message);
        lastMessageTimestamp[channel] = now;
    } else {
        setTimeout(() => {
            client.say(channel, message);
            lastMessageTimestamp[channel] = Date.now();
        }, DEBOUNCE_TIME - (now - lastMessageTimestamp[channel]));
    }
}

//(m!p)
async function searchAndAddVideoByName(name) {
    const apiKey = 'AIzaSyCNjDl65AiVsQC77GjfNKd-klVO1pO63PQ';
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(name)}&type=video&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items.length > 0) {
            const video = data.items[0];
            const videoId = video.id.videoId;
            const videoTitle = video.snippet.title;
            
            const addResponse = await fetch('http://localhost:3000/api/playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, videoTitle })
            });

            if (addResponse.ok) {
                return `Vídeo adicionado a playlist: ${videoTitle}`;
            } else {
                return 'Erro ao adicionar o vídeo a playlist.';
            }
        } else {
            return 'Nenhum vídeo encontrado para o nome: ' + name;
        }
    } catch (error) {
        console.error('Erro:', error);
        return 'Erro ao buscar ou adicionar o vídeo.';
    }
}

client.on('message', async (channel, tags, message, self) => {
    if (self) return;

    if (message.startsWith('m!p')) {
        const args = message.split(' ').slice(1).join(' ');
        if (args) {
            const response = await searchAndAddVideoByName(args);
            sendMessageWithDelay(channel, response);
        } else {
            sendMessageWithDelay(channel, 'Por favor, forneça o nome do vídeo.');
        }
    }
});

/////////////////////////////////////////////////E-MAIL/////////////////////////////////////////////////////////

// email
const transporter = nodemailer.createTransport(emailConfig);

client.on('connected', () => {
    sendMessageWithDelay(channel, 'A janta está pronta, A janta está pronta!!!');

    dbCommands.each("SELECT comando, resposta FROM comandos_chat", (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        customCommands.set(row.comando, row.resposta);
    });

    dbCount.get("SELECT count FROM counter WHERE id = 1", (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        if (row) {
            deathCount = row.count;
        } else {
            dbCount.run("INSERT INTO counter (id, count) VALUES (1, 0)");
            deathCount = 0;
        }
    });
});

// sim foi setado 2 vezes o deathcount para 0 💀
let deathCount = 0;


client.on('message', (channel, user, message, self) => {
    if (self) return;

    if (message.startsWith('!comandos')) {

        if (user.mod || user.username === channel.replace('#', '')) {
            dbCommands.all('SELECT comando FROM comandos_chat', (err, rows) => {
                if (err) {
                    console.error(`Erro ao buscar comandos: ${err.message}`);
                    client.say(channel, 'Erro ao buscar comandos personalizados.');
                    return;
                }

                if (rows.length === 0) {
                    client.say(channel, 'Nenhum comando personalizado encontrado.');
                    return;
                }

                const commandList = rows.map(row => row.comando).join(' | ');

                client.say(channel, `Comandos personalizados: ${commandList}`);
            });
        } else {
            client.say(channel, 'Você não tem permissão para visualizar os comandos personalizados.');
        }
    }
    
    if ((user.mod || user.username === channel.replace('#', '')) && message.startsWith('+com')) {
        const args = message.split(' ');
        if (args.length < 3 || !args[1].startsWith('!')) {
            client.say(channel, 'Formato inválido. Use +com !nome_do_comando resposta_associada');
            return;
        }
        const command = args[1].toLowerCase(); 
        const response = args.slice(2).join(' '); 
        dbCommands.run('INSERT INTO comandos_chat (comando, resposta) VALUES (?, ?)', [command, response], (err) => {
            if (err) {
                console.log(channel, `Erro ao adicionar o comando: ${err.message}`);
                return;
            }
            customCommands.set(command, response);
            client.say(channel, `Comando "${command}" adicionado com sucesso!`);
        });
    }

    if ((user.mod || user.username === channel.replace('#', '')) && message.startsWith('-com')) {
        const args = message.split(' ');
        if (args.length !== 2) {
            client.say(channel, 'Formato inválido. Use -com nome_do_comando');
            return;
        }
        const command = args[1].toLowerCase(); 
        if (customCommands.has(command)) {
            customCommands.delete(command);
            dbCommands.run('DELETE FROM comandos_chat WHERE comando = ?', [command], (err) => {
                if (err) {
                    client.say(channel, `Erro ao remover o comando: ${err.message}`);
                    return;
                }
                client.say(channel, `Comando "${command}" removido com sucesso!`);
            });
        } else {
            client.say(channel, `O comando "${command}" não existe.`);
        }
    }

    if (customCommands.has(message.toLowerCase())) {
        client.say(channel, customCommands.get(message.toLowerCase()));
    }

    ///////////////////////////////////////////////////COMANDOS///////////////////////////////////////////////////////

    //salve

    if (message == 'salve') {
        client.say(channel, `@${user.username}, salve meu bom`);
    }

    if (message.toLowerCase() === '+morte') {
        deathCount++;
        client.say(channel, `O contador de mortes do indiano agora é: ${deathCount}`);
        dbCount.run("UPDATE counter SET count = ? WHERE id = 1", [deathCount], (err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }

    if (message.toLowerCase() === '-morte') {
        if (deathCount > 0) {
            deathCount--;
            client.say(channel, `O contador de mortes do indiano agora é: ${deathCount}`);
            dbCount.run("UPDATE counter SET count = ? WHERE id = 1", [deathCount], (err) => {
                if (err) {
                    console.error(err.message);
                }
            });
        } else {
            client.say(channel, `O contador de  do indiano já está em 0.`);
        }
    }

    if (message.toLowerCase() === '!contador') {
        client.say(channel, `O Indiano morreu ${deathCount} vezes`);
    }

    //loja

    if (message == '!loja') {
        client.say(channel, `${user.username} aqui está o link para a loja: https://carlinhosbot.netlify.app/shop_bot caso alguma duvido com os comandos do bot entre em: https://carlinhosbot.netlify.app/help_bot `)
    }


    // Tabela com números e descrições
    const idTable = [
        { id: 201, description: '8D9Y29E4CE0869971E (key com ativação na GOG: https://www.gog.com/en/redeem) ' },
        { id: 202, description: 'V95VA69C6E2310983F  (key com ativação na GOG: https://www.gog.com/en/redeem) ' },
        { id: 203, description: 'K65Z4180BD58CEF81F  (key com ativação na GOG: https://www.gog.com/en/redeem) ' },
        { id: 204, description: 'AA22FC8559E1E217BF  (key com ativação na GOG: https://www.gog.com/en/redeem) ' },
        { id: 205, description: '04YE2-5Y4N0-VX2CD  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode) ' },
        { id: 206, description: 'NV03W-I5F5Z-NVYC9  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 207, description: 'RXBWV-TCVWD-ARKKP  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 208, description: 'L2XH6-883FJ-ZVH8K  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 209, description: 'MLCEX-CDJT0-M4APN  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 210, description: 'VW06T-3MNDB-DL8T3  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 211, description: '6ZTRM-D4BJ2-GXF8Z  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 212, description: 'L6G3T-V95B2-KDQZ9  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 213, description: 'W7DQJ-B4A7H-WND6T  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 214, description: '4VXVL-YTI2I-2ZNLR  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 215, description: 'VAL9J-MTWG6-QJ2FI  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 216, description: 'só pa testa  (key com ativação na Steam: https://store.steampowered.com/account/redeemwalletcode)' },
        { id: 301, description: 'Seu MELHOR mod de Dragon Ball Z Budokai Tenkaichi 3: https://drive.google.com/file/d/1S9jvHeuV49LVBuP23AFRI2KBbjDtDzOF/view?usp=sharing' },
        { id: 302, description: 'Seu modelo de discord: https://discord.new/yE6X35vQHda5 (caso alguma duvida enviar mensagem para "shin__ki" no discord)' },
    ];



    if (message.startsWith('!comprar')) {
        const args = message.split(' ');
        const userEmail = args[1];
        const desiredId = parseInt(args[2]); 
        
        if (userEmail && !isNaN(desiredId) && idTable.some((entry) => entry.id === desiredId)) {
            const cost = getCostForId(desiredId);

            db.get('SELECT * FROM points WHERE username = ?', user.username.toLowerCase(), (err, row) => {
                if (err) {
                    console.error(err.message);
                    client.say(channel, `@${user.username}, ocorreu um erro ao verificar seus pontos.`);
                } else {
                    const userPoints = row ? row.points : 0;
                    if (userPoints >= cost) {
                        const newPoints = userPoints - cost;
                        const userString = String(user.username); 
                        db.run('UPDATE points SET points = ? WHERE username = ?', newPoints, userString.toLowerCase(), (err) => {
                            if (err) {
                                console.error(err.message);
                                client.say(channel, `@${userString}, ocorreu um erro ao descontar seus pontos.`);
                            } else {
                                const mailOptions = {
                                    from: 'btwitch011@gmail.com',
                                    to: userEmail,
                                    subject: 'Carlinhos Bot',
                                    text: `Seu número é ${desiredId}. Descrição: ${idTable.find((entry) => entry.id === desiredId)?.description || 'Sem descrição'
                                        }`, 
                                };

                                transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        console.error(error);
                                        client.say(channel, `@${user}, ocorreu um erro ao enviar o e-mail.`);
                                    } else {
                                        console.log('Email enviado: ' + info.response);
                                        client.say(channel, `@${user.username}, e-mail enviado com sucesso!`);
                                    }
                                });
                            }
                        });
                    } else {
                        client.say(channel, `@${user.username}, você não tem pontos suficientes para comprar este item.`);
                    }
                }
            });
        } else {
            client.say(
                channel,
                `@${user.username}, por favor, forneça um endereço de e-mail válido e um ID válido da tabela.`
            );
        }
    }

    // Esse codigo aqui precisa de uma otimização pq tá o puro suco da preguiça
    function getCostForId(desiredId) {
        switch (desiredId) {
            case 201:
                return 5000;
            case 202:
                return 5000;
            case 203:
                return 5000;
            case 204:
                return 5000;
            case 205:
                return 5000;
            case 206:
                return 5000;
            case 207:
                return 5000;
            case 208:
                return 5000;
            case 209:
                return 5000;
            case 210:
                return 5000;
            case 211:
                return 5000;
            case 212:
                return 5000;
            case 213:
                return 5000;
            case 214:
                return 5000;
            case 215:
                return 5000;
            case 216:
                return 1;
            case 301:
                return 500;
            case 302:
                return 500;
            default:
                return 0; // pros cara que for chutar IDs que não existem (não sei o pq, mas vale a pena botar)
        }
    }

    //dados

    if (message == '!roll') {
        client.say(channel, `@${user.username} seu número é ${Math.floor(Math.random() * 6) + 1}!`);
    }

    //ping pong

    if (message == 'ping') {
        client.say(channel, `@${user.username}, pong`);
    }

    //Help (Não esquecer de atualizar de vez em quando)

    if (message == '!help') {
        client.say(channel, `@${user.username}, https://carlinhosbot.netlify.app/help_bot `);
    }

    //NegoPlanador

    if (message == '!planador') {
        client.say(channel, `@NegoPlanador , Diario de um detento - racionais Mc:`);
        client.say(channel, `!sr https://www.youtube.com/watch?v=dGFxdmuDA4A `)
    }

    //Nightbot

    if (message == '!M') {
        client.say(channel, `@${user.username},vai se fuder o night bot já faz isso, pede pra ele`);
        client.say(channel, `!parm`);
    }


    const { MongoClient } = require('mongodb');


    //randomizador de nomes

    if (message.toLowerCase() === '!randomnome') {
        const nomes = ['Nego do Bordel', 'Ryu Indiano', 'Amante da Beiçola', 'Tommy Vercetti das Arabias', 'Porteiro de wakanda', 'meu indiano favorito', 'bahubali pt.2',
            'emo indiano', 'indiano a professora e as crianças', 'primo do nego di']; // Insira os nomes que você deseja randomizar
        const randomIndex = Math.floor(Math.random() * nomes.length);
        const randomNome = nomes[randomIndex];
        client.say(channel, `Toddyyz Streamer Streams, ou para os mais intimos ${randomNome}`);
    }

function updatePoints(username, pointsToAdd, callback) {
    db.get('SELECT * FROM points WHERE username = ?', username, (err, row) => {
        if (err) {
            console.error(err.message);
            return callback(err);
        }
        let currentPoints = row ? row.points : 0;
        if (currentPoints < pointsToAdd) {
            return callback(null, false); 
        }

        currentPoints -= pointsToAdd; // // aquele famoso "eu acho" de quantos pontos que o usuario vai por pra jogar

        if (row) {
            db.run('UPDATE points SET points = ? WHERE username = ?', [currentPoints, username], (err) => {
                if (err) {
                    console.error(err.message);
                }
                callback(err, true);
            });
        } else {
            db.run('INSERT INTO points (username, points) VALUES (?, ?)', [username, currentPoints], (err) => {
                if (err) {
                    console.error(err.message);
                }
                callback(err, true);
            });
        }
    });
}

function handleCoinFlip(message, user, channel, side) {
    const chance = 0.5; 
    const random = Math.random();
    const pointsToPlay = 50;

    updatePoints(user.username, pointsToPlay, (err, hasPoints) => {
        if (err || !hasPoints) {
            client.say(channel, `@${user.username}, você não tem pontos suficientes para jogar. Você precisa de ${pointsToPlay} pontos.`);
            return;
        }

        if ((side === 'cara' && random < chance) || (side === 'coroa' && random >= chance)) {
            // Usuário ganha
            client.say(channel, `Parabéns, @${user.username}! Caiu ${side.charAt(0).toUpperCase() + side.slice(1)}`);
            client.say(channel, `${user.username} você acertou e ganhou 100 pontos! 💰`);
            db.get('SELECT * FROM points WHERE username = ?', user.username, (err, row) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                const currentPoints = (row ? row.points : 0) + 100;
                if (row) {
                    db.run('UPDATE points SET points = ? WHERE username = ?', [currentPoints, user.username], (err) => {
                        if (err) {
                            console.error(err.message);
                        }
                    });
                } else {
                    db.run('INSERT INTO points (username, points) VALUES (?, ?)', [user.username, 100], (err) => {
                        if (err) {
                            console.error(err.message);
                        }
                    });
                }
            });
        } else {
            client.say(channel, `@${user.username}, foi mal você errou e perdeu 50 pontos`);
        }
    });
}

if (message.toLowerCase() === '!cara') {
    handleCoinFlip(message, user, channel, 'cara');
}

if (message.toLowerCase() === '!coroa') {
    handleCoinFlip(message, user, channel, 'coroa');
}

// tem que arrumar essa bosta

const loveCounts = {}; 

client.on('message', (channel, user, message, self) => {
    if (self) return; 

    const channelName = channel.substring(1); 

    if (message.toLowerCase().startsWith('!amor')) {
        if (message.trim() === '!amor') {
            if (!loveCounts[channelName]) {
                loveCounts[channelName] = 0;
            }

            loveCounts[channelName] += 1;

            client.say(channel, `A contagem de amor neste canal é ${loveCounts[channelName]}`);
        }
    }
});

//pontos

    db.serialize(() => {
        db.run('CREATE TABLE if not exists points (username TEXT, points INTEGER)');
    });

    client.on('message', (channel, tags, message, self) => {
        if (self) return;

        const username = tags.username.toLowerCase();
        const currentTime = Date.now();

        if (lastMessageTimestamp[username] && (currentTime - lastMessageTimestamp[username]) < DEBOUNCE_TIME) {
            return; 
        }

        lastMessageTimestamp[username] = currentTime;

        const isModerator = tags['user-type'] === 'mod';
        const isBroadcaster = channel.slice(1) === tags.username;

        if ((isModerator || isBroadcaster) && message.toLowerCase().startsWith('!addpontos')) {
            const splitMessage = message.split(' ');
            const targetUsername = splitMessage[1].toLowerCase(); // converte pra não da merda dps
            const amount = parseInt(splitMessage[2]);

            if (!isNaN(amount)) {
                db.get('SELECT * FROM points WHERE username = ?', targetUsername, (err, row) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    if (row) {
                        const currentPoints = row.points + amount;
                        db.run('UPDATE points SET points = ? WHERE username = ?', [currentPoints, targetUsername], (err) => {
                            if (err) {
                                console.error(err.message);
                            }
                        });
                    } else {
                        db.run('INSERT INTO points (username, points) VALUES (?, ?)', [targetUsername, amount], (err) => {
                            if (err) {
                                console.error(err.message);
                            }
                        });
                    }
                    client.say(channel, `@${targetUsername} recebeu ${amount} pontos!`);
                });
            }
        }

        if ((isModerator || isBroadcaster) && message.toLowerCase().startsWith('!subpontos')) {
            const splitMessage = message.split(' ');
            const targetUsername = splitMessage[1].toLowerCase(); 
            const amount = parseInt(splitMessage[2]);

            if (!isNaN(amount)) {
                db.get('SELECT * FROM points WHERE username = ?', targetUsername, (err, row) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    if (row) {
                        const currentPoints = Math.max(row.points - amount, 0);
                        db.run('UPDATE points SET points = ? WHERE username = ?', [currentPoints, targetUsername], (err) => {
                            if (err) {
                                console.error(err.message);
                            } else {
                                client.say(channel, `@${targetUsername} perdeu ${amount} pontos!`);
                            }
                        });
                    } else {
                        db.run('INSERT INTO points (username, points) VALUES (?, ?)', [targetUsername, 0 - amount], (err) => {
                            if (err) {
                                console.error(err.message);
                            } else {
                                client.say(channel, `@${targetUsername} perdeu ${amount} pontos!`);
                            }
                        });
                    }
                });
            }
        }

        if (message.toLowerCase() === '!pontos') {
            db.get('SELECT * FROM points WHERE username = ?', username, (err, row) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                console.log('Row:', row);
                const userPoints = row ? row.points : 0;
                console.log(`User Points for ${username}:`, userPoints);
                client.say(channel, `@${username}, você tem ${userPoints} pontos!`);
            });
        }

        if (message.toLowerCase().startsWith('!tigrinho')) {
            const username = tags.username;
            const betAmount = parseInt(message.split(' ')[1]);

            db.get('SELECT * FROM points WHERE username = ?', username, (err, row) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                if (row) {
                    const currentPoints = row.points;
                    if (betAmount && betAmount <= currentPoints) {
                        const randomNumber = Math.floor(Math.random() * 100) + 1;
                        if (randomNumber <= 30) {
                            const winnings = betAmount * 2;
                            const newPoints = currentPoints + winnings;
                            db.run('UPDATE points SET points = ? WHERE username = ?', [newPoints, username], (err) => {
                                if (err) {
                                    console.error(err.message);
                                }
                            });
                            client.say(channel, `@${username} ganhou ${winnings} pontos no cassino!`);
                        } else {
                            const newPoints = currentPoints - betAmount;
                            db.run('UPDATE points SET points = ? WHERE username = ?', [newPoints, username], (err) => {
                                if (err) {
                                    console.error(err.message);
                                }
                            });
                            client.say(channel, `@${username} perdeu ${betAmount} pontos no cassino!`);
                        }
                    } else {
                        client.say(channel, `@${username}, você não tem pontos suficientes para apostar essa quantia!`);
                    }
                } else {
                    if (betAmount > 0) {
                        client.say(channel, `@${username}, você precisa de pontos para jogar no cassino!`);
                    }
                }
            });
        }
    });

    process.on('SIGINT', () => {
        db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('Conexão com o banco de dados fechada.');
            process.exit(0);
        });
    });
  });