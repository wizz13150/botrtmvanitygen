// Classes discord.js nécessaires
const { Client, Events, GatewayIntentBits } = require('discord.js');
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
let queue = [];
queue.isProcessing = false;

// Creation nouvelle instance client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

// Once Only, log console quand bot ready
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});


// Quand un message est envoyé sur le serveur Discord
client.on('messageCreate', message => {
  // Si le message ne vient pas d'un bot et qu'il commence par /vanity
  if (!message.author.bot && message.content.toLowerCase().startsWith('/vanity')) {
    // Incrémente le compteur de lancements de VanityGen
    i++;
    writeI(i);
    // On compte le nombre de requête de l'utilisateur dans lale, quota
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
    if (vanityCount >= 10) {
      message.reply(`Already 10 requests, fuck off. Try later ((:`)
      return;
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
        word.length > 8
      ) {
        // Si le mot ne respecte pas les critères, affiche l'erreur et les règles
        message.reply(`Rules for each pattern:\n- 8 chars long !\n- First char must be "R".\n- Second char refused: 012345678Z and lowercase.\n- Third char -ToDo-...\n- Alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".`);
        // Supprime l'élément traité de la file d'attente
      return;
      }
    }
  
  // Si okay, on génère l'addresse
  console.log(`[LOG] User ${message.author.username} searched ${pattern}`);
  message.reply(`RTM VanityGen used ${i} times *since last bug xD\nCurrent queue size before yours: ${queue.length}\nSearching ${pattern}... Will DM you the address and key when found`);
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
    // Supprime la dernière demande de l'utilisateur de la file d'attente
    let entryRemoved = false;
    for (let r = queue.length - 1; r >= 0; r--) {
        if (queue[r].message.author === message.author) {
          message.reply(`Request for '${queue[r].pattern}' deleted from queue`);
          queue.splice(r, 1); // Supprime l'entrée de l'utilisateur à l'index r
          entryRemoved = true;
          break;
        }
    }
    if (!entryRemoved) {
      message.reply(`No request from you in queue`);
    }
  } 
  // Commande pour voir le job en cours
  else if (message.content.toLowerCase().startsWith('/vcurrent')) {
    if (queue.length > 0) {
      message.reply(`The current pattern being searched is: ${queue[0].pattern}`);
    } else {
      message.reply(`There is no current pattern being searched`);
    }
  }
  else if (message.content.toLowerCase().startsWith('/vquota')) {
    let Count = 0;
    const authorId = message.author.id;
    for (const queuedMessage of queue) {
      if (queuedMessage.message.author.id === authorId) {
        Count++;
      }    
    } 
    message.reply(`You have ${Count} requests in queue :\nToDo`)
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
        let ligne = lignes[s];
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
    let output = lines.slice(-3).join("\n");
    // Arrêt des compteurs
    let durationInMinutes = ((Date.now() - startTime) / 60000).toFixed(0);
    let durationInSeconds = ((Date.now() - startTime) / 1000).toFixed(0);
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
