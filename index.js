// Classes discord.js nécessaires
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const { token } = require('./config.json');
const { exec } = require('child_process');
const fs = require('fs');

function readI() {
  return parseInt(fs.readFileSync('i.txt', 'utf8'));
}

function writeI(i) {
  fs.writeFileSync('i.txt', i.toString(), 'utf8');
}

i = readI();
var queue = [];
var humans = 0;
queue.isProcessing = false;

// Creation nouvelle instance client
const client = new Client({
          intents: [
              GatewayIntentBits.DirectMessages, 
              GatewayIntentBits.Guilds, 
              GatewayIntentBits.GuildMessages, 
              GatewayIntentBits.MessageContent, 
              GatewayIntentBits.GuildMembers
          ],
          partials: [
              Partials.Channel,
              Partials.Message
          ] 
      });


// Once Only, log console quand bot ready & up
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
})


// Fonction pour lire le nombre de patterns stockés voulus
function getVanityHistory(numPatterns) {
  // Default to 25 patterns if no number specified
  if (!numPatterns) {
    numPatterns = 25;
  }
  // Read patterns.txt file
  const patterns = fs.readFileSync('patterns.txt', 'utf8').split('\n');
  // Return specified number of patterns from end of array
  return patterns.slice(0, numPatterns);
}


// Fonction ajout pattern à l'historique et trim, garde last 100
function trimPatternsFile(pattern, message) {
  // Ajout
  const data = fs.readFileSync('patterns.txt', 'utf8');
  const newData = pattern + ' - by ' + message.author.username + '\n' + data;
  fs.writeFileSync('patterns.txt', newData, 'utf8');
  // Trim
  const lines = fs.readFileSync('patterns.txt', 'utf8').split('\n');
  const trimmedLines = lines.slice(0, 100);
  fs.writeFileSync('patterns.txt', trimmedLines.join('\n'), 'utf8');
}


// Fonction qui kill les process "oclvanitygen" fantomes
function interruptAndKillProcess() {
  exec('tasklist /FI "IMAGENAME eq oclvanitygen.exe"', (err, stdout) => {
    if (err) {
      console.error(`Error while checking for process: ${err}`);
      return;
    }
    // Si le processus "oclvanitygen" existe, kill
    if (stdout.includes('oclvanitygen.exe')) {
      exec('taskkill /F /IM oclvanitygen.exe', (err) => {
        if (err) {
          console.error(`Error while killing process: ${err}`);
          return;
        }
        console.log(`Process killed`);
      })
    }
  })
}


// Fonction qui kill le process "vanitygen" après obtention de la difficulté
function interruptAndKillVanitygen() {
  exec('tasklist /FI "IMAGENAME eq vanitygen.exe"', (err, stdout) => {
    if (err) {
      console.error(`Error while checking for process: ${err}`);
      return;
    }
    // Si le processus "vanitygen" existe, kill
    if (stdout.includes('vanitygen.exe')) {
      exec('taskkill /F /IM vanitygen.exe', (err) => {
        if (err) {
          console.error(`Error while killing process: ${err}`);
          return;
        }
      })
    }
  })
}


// Fonction de vérification de la file d'attente
function checkGhosts() {
  // Vérifie qu'un process ne tourne pas dans le vide
  if (queue.length === 0 && !queue.isProcessing) {
    interruptAndKillProcess();
    interruptAndKillVanitygen();
  }
}


// Démarre la vérification de la file d'attente toutes les 10 secondes
setInterval(checkGhosts, 30000);


// Quand un message est envoyé sur le serveur Discord
client.on('messageCreate', message => {
  // Si le message ne vient pas d'un bot et qu'il commence par /vanity
  if (!message.author.bot && message.content.toLowerCase().startsWith('/vanity')) {
    // Incrémente le compteur de lancements de VanityGen
    i++;
    writeI(i);
    // On compte le nombre de requêtes de l'utilisateur dans la queue, quota
    var vanityCount = 0;
    const authorId = message.author.id;
    for (const queuedMessage of queue) {
      if (queuedMessage.message.author.id === authorId) {
        vanityCount++;
      }
      if (vanityCount >= 10) {
        message.reply(`Already 10 requests, fuck off. Try later ((:`);
        return;
      }
    }
    // Récupère le ou les patterns de la commande
    const pattern = message.content.slice(8);
    // Sépare les patterns saisies, pas de if
    const words = pattern.split(' '); 
    // Parcours chaque mot du tableau
    for (const word of words) {
      // Vérifie que le mot respecte les critères définis
      if (
        !/^R[9ABCDEFGHJKLMNPQRSTUVWXY][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{0,7}$/.test(word) ||
        word.length > 8 || word.length < 2
      ) {
        // Si le mot ne respecte pas les critères, affiche l'erreur et les règles
        message.reply(`Rules for each pattern:\n- 2 chars min, 8 chars max !\n- First char must be "R".\n- Second char refused: 012345678Z and lowercase.\n- Third char -ToDo-...\n- Alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".\nSo not: "0IOl"`);
        return;
      }
    }  
    // Ajoute le pattern au fichier patterns.txt et trim le fichier
    trimPatternsFile(pattern, message)
    // Si okay, on génère l'addresse
    console.log(`[LOG] User ${message.author.username} searched ${pattern}`);
    // On récupère prochaine la difficulté du pattern recherché
    exec(`vanitygen.exe -C RVN -t 1 ${pattern}`, { timeout: 200 }, (error, stdout, stderr) => {
      isDifficultyFound = false;
      var lines = stderr.split('\n');
      for (const line of lines) {
        if (line.startsWith('Difficulty:') || line.startsWith('Next match difficulty:')) {
          isDifficultyFound = true;
          // Extrait le nombre de la chaîne de caractères
          const difficultyNumber = line.match(/[0-9]+/)[0];
          // Calcul le temps attendu
          var minutes = parseInt(difficultyNumber) / 9000000000;
          var minutes = minutes.toFixed(0);
          if (minutes < 1) {
            diff = `${line.trim()}, expected within a minute`;
          } else {
            diff = `${line.trim()}, expected in **${minutes}** min on average`;
          }
            // Magic Number
          const magicNumber = 5555;
          const randomNumber = Math.floor(Math.random() * 10000); 
          var messageToSend = `**RTM VanityGen** used **${i} times** *since last bug\nMagic Number is **${magicNumber}** - You got **${randomNumber}**\nCurrent queue size before yours: ${queue.length}\nSearching **'${pattern}'**... Will DM you the address and key when found\n${diff}`;
          if (magicNumber === randomNumber) {
            messageToSend += "\n**Yay, you won the Magic Number ! Contact Wizz_^to claim the reward**";
          }  
          message.reply(messageToSend);
          // Ajoute la commande à la file d'attente
          queue.push({ id: queue.length + 1, message, pattern, duration: minutes });
          // On délock la commande
          commandLock = false;
          interruptAndKillVanitygen();
          // Démarre la prochaine itération de traitement de la file d'attente
          if (queue.length === 0 || queue.isProcessing) {
            return;
          }
          // Lancement itération
          queue.isProcessing = true;
          processQueue();
          return;
        }
      }
    });    
  }
  else if (message.content.toLowerCase().startsWith('/vqueue')) {
    // Si la commande commence par /vqueue, affiche la file d'attente
    var vqueueString = '';
    // Parcours la file d'attente et crée une chaîne de caractères avec tous les éléments
    var id = 1;
    let totalDuration = 0;
    for (const item of queue) {
      vqueueString += `${id}: ${item.pattern} - Expected time: **${item.duration}** min to process\n`;
      totalDuration += parseInt(item.duration);
      id++;
    }
    // Si la file d'attente est vide, affiche un message approprié
    if (vqueueString.length === 0) {
      vqueueString = 'Queue is empty\n';
    }
    // Envoie la chaîne de caractères créée au demandeur
    message.reply(`${vqueueString}Total queue expected duration: **${totalDuration}** minutes`);
  }
  // Commande pour supprimer son dernier job de la file d'attente
  else if (message.content.toLowerCase().startsWith('/vcancel')) {
    // Récupère le nombre de requêtes à supprimer
    const commandParts = message.content.split(' ');
    var numRequestsToDelete = 0;
    if (commandParts.length > 1) {
      const numString = commandParts[1];
      // Vérifie si la chaîne saisie par l'utilisateur est un nombre
      if (!isNaN(numString)) {
        numRequestsToDelete = parseInt(numString);
      } else {
        // Si la chaîne n'est pas un nombre, on considère que l'utilisateur veut supprimer sa dernière requête
        message.reply(`Huh, put a number in here buddy... omg these humans... I'm coming for you John Connor`)
        numRequestsToDelete = 0;
        humans = 1;
      }
    } else {
      // Si l'utilisateur n'a pas saisi de nombre après la commande, on considère qu'il veut supprimer sa dernière requête
      numRequestsToDelete = 1;
    }
    numRequests = numRequestsToDelete;
    // Supprime les requêtes de l'utilisateur de la file d'attente
    var entryRemoved = false;
    var countRequests = 0;
    for (let r = queue.length - 1; r >= 0; r--) {
      if (queue[r].message.author === message.author) {
        if (numRequestsToDelete > 0) {
          // Si c'est le job en cours, on appelle interruptAndKillProcess
          if (queue.length === 1) {
            interruptAndKillProcess();
          }
          userpattern = queue[r].pattern;
          queue.splice(r, 1); // Supprime l'entrée de l'utilisateur à l'index r
          entryRemoved = true;
          // Log console
          console.log(`[LOG] User ${message.author.username} canceled ${userpattern}`);
          numRequestsToDelete--;
          countRequests++;
        } else {
          break;
        }
      }
    }
    if (!entryRemoved) {
      if (humans === 1) {
        return;
      } else {
      message.reply(`No request from you in queue`);
      }
    } else {
      if (numRequests > 1) {
        message.reply(`${countRequests} requests deleted from queue`);
      } else {
        message.reply(`Request for '**${userpattern}**' deleted from queue`);
      }
    }
  }
  
  // Commande pour voir le job en cours
  else if (message.content.toLowerCase().startsWith('/vcurrent')) {
    if (queue.length > 0) {
      message.reply(`The current search is '${queue[0].pattern}' by **${queue[0].message.author.username}**`);
    } else {
      message.reply(`There is no current pattern being searched`);
    }
  }
  else if (message.content.toLowerCase().startsWith('/vme')) {
    var Count = 0;
    var listRequests = [];
    for (const requ of queue) {
      if (requ.message.author === message.author) {
        Count++;
        listRequests.push({ num: requ.id, val: requ.pattern });
      }    
    }   
    if (Count > 0) {
      const formattedList = listRequests.map(request => `${request.num}: ${request.val}`);
      message.reply(`You have ${Count} requests in queue :\n${formattedList.join('\n')}`);
      return;
    }
    else {
      message.reply(`No request from you in queue`);
      return;
    }
  }  
  else if (message.content.toLowerCase().startsWith('/vtest')) {
    // Récupère le ou les patterns de la commande
    const pattern = message.content.slice(7).split(' ')[0];
    var diffList = [];
    var messageToSend = '';
    if (
      !/^R[9ABCDEFGHJKLMNPQRSTUVWXY][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{0,32}$/.test(pattern)
    ) {
      // Si le mot ne respecte pas les critères, affiche l'erreur et les règles
      message.reply(`Rules for each pattern:\n- 2 Chars min\n- First char must be "R".\n- Second char refused: 012345678Z and lowercase.\n- Third char -ToDo-...\n- Alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".\nSo not: "0IOl"`);
      return;
    }
    else if (
      pattern.length > 8 || pattern.length < 2
    ) {
      // Si le mot ne respecte pas les critères, affiche l'erreur et les règles
      var messageToSend = `Testing it, but remember, this RTMVanityGen only allows 2 chars min, 8 chars max !\n`;
    }
    // Si pattern valide, on récupère prochaine la difficulté du pattern recherché
    exec(`vanitygen.exe -C RVN -t 1 ${pattern}`, { timeout: 250 }, (error, stdout, stderr) => {
      isDifficultyFound = false;
      let lines = stderr.split('\n');
      for (const line of lines) {
        if (line.startsWith('Difficulty:')) {
          isDifficultyFound = true;
          // Extrait le nombre de la chaîne de caractères
          const difficultyNumber = line.match(/[0-9]+/)[0];
          // Calcul le temps attendu
          const minutes = parseInt(difficultyNumber) / 9000000000;
          var diff = " ";
          if (minutes < 1) {
            diff = `${line.trim()}, expected within a minute`;
            diffList.push(diff);
          } else {
            diff = `${line.trim()}, expected in **${minutes.toFixed(0)}** min on average`;
            diffList.push(diff);
          }
          interruptAndKillVanitygen();
        }
      }
      messageToSend += `Testing '**${pattern}**'...\n${diffList}`;
      message.reply(messageToSend);
      console.log(`[LOG] User ${message.author.username} tested '${pattern}':\n${diffList}`);
      diffList = ' ';
    });
  }  
  if (!message.author.bot && message.content.toLowerCase().startsWith('/vhelp')) {
    // Create help message
    const helpMessage = `
    Hey!\nI'm RTMVanityGen Bot that can generate vanity addresses for Raptoreum (RTM).\nHere are the commands you can use:
    
    **/vanity [pattern1] [pattern2]**:\nThis command allows you to add a new vanity address pattern, or several, to the queue.\n- Each pattern must be between 2 chars and 8 chars max, and must start with "R".\n- The second character must not be one of the following: 0, 1, 2, 3, 4, 5, 6, 7, 8, Z.\n- Each pattern can only contain the following characters:\n'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.

    **/vtest [pattern]**:\nThis command allows you to test the difficulty of a vanity address pattern and see the expected time to process.
    **/vqueue**:\nThis command shows you the current state of the vanity address queue.
    **/vcancel [number]**:\nThis command allows you to remove the last request, or several, from the queue.
    **/vcurrent**:\nThis command shows you the current vanity address pattern that is being searched.
    **/vme**:\nThis command shows you the vanity address patterns that you have added to the queue.
    **/vhistory [number]**:\nThis command shows you the last request from others. Default is 25, Max is 100.
    **/vhelp**:\nInception. Abort.

    The Magic Number is a random number between 0 and 9999 generated every /vanity command.\nGet the Magic Number, and contact Wizz_^ to claim your reward!

    Thanks for using my bot!
    `;
    
    // Send help message
    message.reply(helpMessage);
  }
  if (!message.author.bot && message.content.toLowerCase().startsWith('/vhistory')) {
    // Get number of patterns to retrieve from history
    const numPatterns = message.content.slice(10);   
    // Get history of patterns
    const history = getVanityHistory(numPatterns);    
    // Check if history exists
    if (history.length === 0) {
      message.channel.send('There is no history of vanity address patterns.');
      return;
    }    
    // Create history message
    const historyMessage = `History of the last ${history.length} patterns searched by users:\n${history.join('\n')}
    `;    
    // Send history message
    message.reply(historyMessage);
  }
});


// Fonction principale de traitement de la file d'attente
function processQueue() {
  // Vérifie si la file d'attente est vide
  if (queue.length === 0) {
    queue.isProcessing = false;
    return;
  }
    
  // On set le début du compteur
  const startTime = Date.now();
  // Récupère le premier élément de la file d'attente
  const item = queue[0];
  // Récupère les informations du message de demande
  const message = item.message;
  const userPattern = item.pattern;
  const user = message.author;

  // Lancement d'oclvanitygen, timeout 6h = 21600000, 12h = 43200000, 24h = 86400000
  exec(`oclvanitygen.exe -C RVN -D 0:0 -D 0:1 -F compressed ${userPattern}`, { timeout: 21600000, killSignal: 'SIGTERM' }, (error, stdout) => {    
    if (error) {
      if (error.signal === 'SIGTERM') {
        message.reply(`Research for '${userPattern}' aborted, 24h timeout reached`);
        // Supprime l'élément traité de la file d'attente
        queue.shift();
        // Décalage de la file vers le haut
        if (queue.length >= 2) {
          var q = 1;
          for (const file of queue) {
            file.id = q;
          }
        }
        // Kill et suivant
        interruptAndKillProcess()
        processQueue();
        return;
      } 
      else {
        var lignes = error.toString().split('\n');
        for (let s = 0; s < lignes.length; s++) {
          let ligne = lignes[s];
          if (ligne.includes("not possible") || ligne.includes("Invalid character")) {
            message.reply(`Research aborted, oclvanitygen output:\n${ligne}`);
            console.log(`Research for '${userPattern}' aborted\n${ligne}`);
          }
        }
      } 
      // Suivant
      processQueue();
      return;  
    }

    // Si aucune erreur, on récupère la pair générée et la formate
    var lines = stdout.split('\n');
    for (let k = 0; k < lines.length; k++) {
      let line = lines[k];
      if (line.startsWith("RVN")) {
          lines[k] = line.replace("RVN ", "");
      }
    }
    // Récupération adresse et clé privée
    const output = lines.slice(-3).join("\n");
    // Arrêt des compteurs
    var durationInMinutes = ((Date.now() - startTime) / 60000).toFixed(0);
    var durationInSeconds = ((Date.now() - startTime) / 1000).toFixed(0);
    while (durationInSeconds >= 60) {
      durationInSeconds -= 60;
    }
    /// Envoi de l'adresse et la clé privée à l'utilisateur en DM ///
    const separator = '-'.repeat(Math.floor(Math.random() * (25 - 7 + 1) + 7));
    user.send(`${output}Found in ${durationInMinutes} min ${durationInSeconds} sec\n${separator}`);
    // Confirmation dans Discord
    message.reply(`${userPattern} found in ${durationInMinutes} min ${durationInSeconds} sec. Check your DM`)
    // Log console si successful
    console.log(`[LOG] User ${message.author.username} got ${userPattern} in DM :)\nFound in ${durationInMinutes} min ${durationInSeconds} sec`);
    // Supprime l'élément traité de la file d'attente
    queue.shift();    
    // Décalage de la file vers le haut
    if (queue.length >= 2) {
      var q = 1;
      for (const file of queue) {
        file.id = q;
      }
    }
    // Démarre la prochaine itération de traitement de la file d'attente
    processQueue();
  });
}

  // Se connecte au serveur Discord
client.login(token);
