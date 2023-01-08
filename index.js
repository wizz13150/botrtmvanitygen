// Classes discord.js nécessaires
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { exec, spawn } = require('child_process');
const fs = require('fs');

function readI() {
  return parseInt(fs.readFileSync('i.txt', 'utf8'));
}

function writeI(i) {
  fs.writeFileSync('i.txt', i.toString(), 'utf8');
}

i = readI();
let queue = [];
let humans = 0;
queue.isProcessing = false;

// Creation nouvelle instance client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

// Once Only, log console quand bot ready & up
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
})


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
    interruptAndKillVanitygen()
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
    let vanityCount = 0;
    const authorId = message.author.id;
    for (const queuedMessage of queue) {
      if (queuedMessage.message.author.id === authorId) {
        vanityCount++;
      }
      if (vanityCount >= 10) {
        message.reply(`Already 10 requests, fuck off. Try later ((:`)
        break;
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
        // Supprime l'élément traité de la file d'attente
      return;
      }
    }
  
  // Si okay, on génère l'addresse
  console.log(`[LOG] User ${message.author.username} searched ${pattern}`);



  // On récupère prochaine la difficulté du pattern recherché
  exec(`vanitygen.exe -C RVN -t 1 ${pattern}`, { timeout: 100 }, (error, stdout, stderr) => {
    isDifficultyFound = false;
    let lines = stderr.split('\n');
    for (const line of lines) {
      if (line.startsWith('Difficulty:')) {
        isDifficultyFound = true;
        // Extrait le nombre de la chaîne de caractères
        const difficultyNumber = line.match(/[0-9]+/)[0];
        // Calcul le temps attendu
        const minutes = parseInt(difficultyNumber) / 9000000000;
        if (minutes < 1) {
          diff = `${line.trim()}, expected within a minute`;
        } else {
          diff = `${line.trim()}, expected in **${minutes.toFixed(0)}** min on average`;
        }
          // Magic Number
        const magicNumber = 5555;
        const randomNumber = Math.floor(Math.random() * 10000); 
        let messageToSend = `**RTM VanityGen** used **${i} times** *since last bug\nMagic Number is **${magicNumber}** - You got **${randomNumber}**\nCurrent queue size before yours: ${queue.length}\nSearching **'${pattern}'**... Will DM you the address and key when found\n${diff}`;
        if (magicNumber === randomNumber) {
          messageToSend += "\n**Yay, you won the Magic Number ! Contact Wizz_^to claim the reward**";
        }  
        message.reply(messageToSend);
        interruptAndKillVanitygen()
      }
    }
  });  

  
  // Ajoute la commande à la file d'attente
  queue.push({ id: queue.length + 1, message, pattern });
  // Démarre la prochaine itération de traitement de la file d'attente
  if (queue.length === 0 || queue.isProcessing) {
    return;
  }
  // Lancement itération
  queue.isProcessing = true;
  processQueue();
  return;
  }
  else if (message.content.toLowerCase().startsWith('/vqueue')) {
    // Si la commande commence par /vqueue, affiche la file d'attente
    let vqueueString = '';
    // Parcours la file d'attente et crée une chaîne de caractères avec tous les éléments
    for (const item of queue) {
      vqueueString += `${item.id}: ${item.pattern}\n`;
    }
    // Si la file d'attente est vide, affiche un message approprié
    if (vqueueString.length === 0) {
      vqueueString = 'Queue is empty';
    }
    // Envoie la chaîne de caractères créée au demandeur
    message.reply(`${vqueueString}`);
  }
  // Commande pour supprimer son dernier job de la file d'attente
  else if (message.content.toLowerCase().startsWith('/vcancel')) {
    // Récupère le nombre de requêtes à supprimer
    const commandParts = message.content.split(' ');
    let numRequestsToDelete = 0;
    if (commandParts.length > 1) {
      const numString = commandParts[1];
      // Vérifie si la chaîne saisie par l'utilisateur est un nombre
      if (!isNaN(numString)) {
        numRequestsToDelete = parseInt(numString);
      } else {
        // Si la chaîne n'est pas un nombre, on considère que l'utilisateur veut supprimer sa dernière requête
        message.reply(`Huh, put a number in here buddy... omg these humans...I'm coming for you John Connor`)
        numRequestsToDelete = 0;
        humans = 1;
      }
    } else {
      // Si l'utilisateur n'a pas saisi de nombre après la commande, on considère qu'il veut supprimer sa dernière requête
      numRequestsToDelete = 1;
    }
    numRequests = numRequestsToDelete
    // Supprime les requêtes de l'utilisateur de la file d'attente
    let entryRemoved = false;
    let countRequests = 0;
    for (let r = queue.length - 1; r >= 0; r--) {
      if (queue[r].message.author === message.author) {
        if (numRequestsToDelete > 0) {
          // Si c'est le job en cours, on appelle interruptAndKillProcess
          if (queue.length === 1) {
            interruptAndKillProcess();
          }
          userpattern = queue[r].pattern
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
        return
      } else {
      message.reply(`No request from you in queue`);
      }
    } else {
      if (numRequests > 1) {
        message.reply(`${countRequests} requests deleted from queue`);
      } else {
        message.reply(`Request for ${userpattern} deleted from queue`);
      }
    }
  }
  
  // Commande pour voir le job en cours
  else if (message.content.toLowerCase().startsWith('/vcurrent')) {
    if (queue.length > 0) {
      message.reply(`The current search is '${queue[0].pattern}' by **${message.author.username}**`);
    } else {
      message.reply(`There is no current pattern being searched`);
    }
  }
  else if (message.content.toLowerCase().startsWith('/vquota')) {
    let Count = 0;
    const authorId = message.author;
    console.log(`authorId ${authorId}`);
    for (const queuedMessage of queue) {
      console.log(`queuedMessage.message.author ${queuedMessage.message.author}`);
      if (queuedMessage.message.author === authorId) {
        Count++;
        console.log(Count);
        return
      }    
    } 
    if (Count === 0) {
      message.reply(`You have ${Count} requests in queue :\nToDo`);
      console.log(Count);
      return
    }
    else {
      message.reply(`No request from you in queue`);
      return
    }
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

  // Lancement d'oclvanitygen
  exec(`oclvanitygen.exe -C RVN -D 0:0 -D 0:1 -F compressed ${userPattern}`, (error, stdout) => {    
    if (error) {
      let lignes = error.toString().split('\n');
      for (let s = 0; s < lignes.length; s++) {
        const ligne = lignes[s];
        if (ligne.includes("not possible") || ligne.includes("Invalid character")) {
          message.reply(`Research aborted, oclvanitygen output:\n${ligne}`);
          console.log(`Research for '${userPattern}' aborted\n${ligne}`);
        }
      }
      // Supprime l'élément traité de la file d'attente
      queue.shift();
      // Démarre la prochaine itération de traitement de la file d'attente
      processQueue();
      return;
    }

    // Si aucune erreur, on récupère la pair générée et la formate
    let lines = stdout.split('\n');
    for (let k = 0; k < lines.length; k++) {
      let line = lines[k];
      if (line.startsWith("RVN")) {
          lines[k] = line.replace("RVN ", "");
      }
    }
    // Récupération adresse et clé privée
    const output = lines.slice(-3).join("\n");
    // Arrêt des compteurs
    const durationInMinutes = ((Date.now() - startTime) / 60000).toFixed(0);
    const durationInSeconds = ((Date.now() - startTime) / 1000).toFixed(0);
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
    if (queue.length > 2) {
      for (let q = 0; q < queue.length; q++) {
        queue[q].id = q + 1;
      }
    }
    // Démarre la prochaine itération de traitement de la file d'attente
    processQueue();
  });
}

  // Se connecte au serveur Discord
client.login(token);
