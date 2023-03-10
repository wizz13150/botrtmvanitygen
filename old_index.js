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

// Fonction qui kill le process "oclvanitygen"
function interruptAndKillProcess() {
  exec('tasklist /FI "IMAGENAME eq oclvanitygen.exe"', (err, stdout, stderr) => {
    if (err) {
      console.error(`Error while checking for process: ${err}`);
      return;
    }
    // Si le processus "oclvanitygen" existe, kill
    if (stdout.includes('oclvanitygen.exe')) {
      exec('taskkill /F /IM oclvanitygen.exe', (err, stdout, stderr) => {
        if (err) {
          console.error(`Error while killing process: ${err}`);
          return;
        }
        console.log(`Process killed`);
      });
    }
  });
}

// Démarre la vérification de la file d'attente toutes les 10 secondes
setInterval(checkQueue, 10000);

// Quand un message est envoyé sur le serveur Discord
client.on('messageCreate', message => {
  // Si le message ne vient pas d'un bot et qu'il commence par /vanity
  if (!message.author.bot && message.content.toLowerCase().startsWith('/vanity')) {
    // Incrémente le compteur de lancements de VanityGen
    i++;
    writeI(i);
    // Récupère le pattern de la commande
    const pattern = message.content.slice(8); // Récupère la chaîne de caractères après "/vanity"
    // Vérifie que le pattern respecte les critères définis
  if (
    !/^R[9ABCDEFGHJKLMNPQRSTUVWXY][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{0,6}$/.test(pattern) ||
    pattern.length > 7
  ) {
    // Si pas bon, on affiche l'erreur et les règles
    message.reply(`Pattern Rules:\n- 7 chars long for now !\n- First char must be "R".\n- Second char alphabet: 9ABCDEFGHJKLMNPQRSTUVWXY.\n- Third char -ToDo-\n- Alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".`);
    // Supprime l'élément traité de la file d'attente
    queue.shift();
    // Démarre la prochaine itération de traitement de la file d'attente
    processQueue();
    return;
  }  
  
  // Si okay, on génère l'addresse
  console.log(`[LOG] User ${message.author.username} searched ${pattern}`);
  message.reply(`VanityGen used ${i} times\nCurrent queue size before yours: ${queue.length}\nSearching ${pattern}... Will DM you the address and key when found`);
  // Ajoute la commande à la file d'attente
  queue.push({ id: queue.length + 1, message, pattern });
  }
  else if (message.content.toLowerCase().startsWith('/vqueue')) {
    // Affiche la file d'attente à l'utilisateur
    if (queue.length > 0) {
      let queueString = `Current queue:\n`;
      for (let j = 0; j < queue.length; j++) {
        queueString += `${queue[j].id}. ${queue[j].pattern}\n`;
      }
      message.reply(queueString);
    } else {
      message.reply(`The queue is empty.`);
    }
  } 
  // Commande pour supprimer son dernier job de la file d'attente
  else if (message.content.toLowerCase().startsWith('/vcancel')) {
    // Supprime la dernière demande de l'utilisateur de la file d'attente
    let entryRemoved = false;
    for (let r = queue.length - 1; r >= 0; r--) {
        if (queue[r].message.author === message.author) {
          message.reply(`Request for ${queue[r].pattern} deleted from queue`);
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
      message.reply(`The current pattern being searched is: ${queue[0].pattern} by ${queue[0].message.author}`);
    } else {
      message.reply(`There is no current pattern being searched`);
    }
  }
});

// Fonction de vérification de la file d'attente
function checkQueue() {
  // Vérifie qu'un process ne tourne pas dans le vide
  if (queue.length === 0 && !queue.isProcessing) {
    interruptAndKillProcess();
  }
  // Vérifie si la file d'attente est vide
  if (queue.length === 0 || queue.isProcessing) {
    return;
  }
  // Lancement itération
  queue.isProcessing = true;
  processQueue();    
}


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
          console.log(`Research for ${userPattern} aborted\n${ligne}`);
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
    user.send(`${output}Found in ${durationInMinutes} min ${durationInSeconds} sec`);
    // Confirmation dans Discord
    message.reply(`${userPattern} found in ${durationInMinutes} min ${durationInSeconds} sec. Check your DM`)

    // Log console si successful
    console.log(`[LOG] User ${message.author.username} got ${userPattern} in DM :)\nFound in ${durationInMinutes} min ${durationInSeconds} sec`);
    // Supprime l'élément traité de la file d'attente
    queue.shift();
    // Démarre la prochaine itération de traitement de la file d'attente
    processQueue();
  });
}

  // Se connecte au serveur Discord
client.login(token);
