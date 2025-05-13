const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

// Inicializando o Express e criando o servidor HTTP
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Inicializando o banco de dados SQLite
let db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
    } else {
        console.log("Conectado ao banco de dados SQLite");
    }
});

// Criar a tabela de mensagens, usuários e contatos se não existirem
db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE
)`);

db.run(`CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    mensagem TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    grupo BOOLEAN,
    destinatario TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS contatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    contato TEXT
)`);

// Serve arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Função auxiliar para verificar se o usuário existe
function usuarioExiste(username, callback) {
    db.get(`SELECT * FROM usuarios WHERE username = ?`, [username], (err, row) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, row);
        }
    });
}

// Quando um cliente se conecta via WebSocket
io.on('connection', (socket) => {
    console.log('Um usuário se conectou');

    // Quando o cliente tenta criar uma conversa
    socket.on('criar conversa', (username, destinatario) => {
        usuarioExiste(username, (err, usuario) => {
            if (err || !usuario) {
                socket.emit('erro', 'Usuário não encontrado!');
            } else {
                // Verifica se o destinatário é válido
                usuarioExiste(destinatario, (err, destinatarioUsuario) => {
                    if (err || !destinatarioUsuario) {
                        socket.emit('erro', 'Destinatário não encontrado!');
                    } else {
                        // Adiciona o contato na tabela de contatos
                        db.run(`INSERT INTO contatos (usuario, contato) VALUES (?, ?)`, [username, destinatario], (err) => {
                            if (err) {
                                console.error("Erro ao adicionar contato:", err);
                            }
                        });
                        socket.emit('sucesso', `Conversa com ${destinatario} criada com sucesso!`);
                    }
                });
            }
        });
    });

    // Quando um usuário envia uma mensagem
    socket.on('chat message', (msg, usuario, destinatario, grupo) => {
        db.run(`INSERT INTO mensagens (usuario, mensagem, destinatario, grupo) VALUES (?, ?, ?, ?)`, [usuario, msg, destinatario, grupo], (err) => {
            if (err) {
                console.error("Erro ao salvar a mensagem:", err);
            }
        });

        // Envia a mensagem para o destinatário ou para todos no grupo
        if (grupo) {
            io.emit('chat message', { usuario, mensagem: msg, destinatario });
        } else {
            socket.to(destinatario).emit('chat message', { usuario, mensagem: msg });
        }
    });

    // Quando o usuário se desconecta
    socket.on('disconnect', () => {
        console.log('Um usuário se desconectou');
    });
});

// Inicia o servidor na porta 3000
server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});



function sendMessage() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text || !currentUser || !currentGroup) return;
  
    const groups = getGroups();
    const msg = { user: currentUser, text, timestamp: new Date().toISOString() };
    groups[currentGroup].messages.push(msg);
    setGroups(groups);
  
    input.value = '';
    loadMessages();
  }
  
  function loadMessages() {
    const groups = getGroups();
    const container = document.getElementById('messages');
    container.innerHTML = '';
    if (!currentGroup || !groups[currentGroup]) return;
  
    groups[currentGroup].messages.forEach((msg, index) => {
      const div = document.createElement('div');
      div.className = 'message';
  
      const span = document.createElement('span');
      span.className = 'msg-text';
      span.innerHTML = `<span class="msg-header">${msg.user}:</span> ${msg.text} <span class="timestamp">[${formatTimestamp(msg.timestamp)}]</span>`;
      div.appendChild(span);
  
      if (msg.user === currentUser) {
        const btn = document.createElement('button');
        btn.textContent = '🗑️';
        btn.className = 'del-btn';
        btn.onclick = () => deleteMessage(index);
        div.appendChild(btn);
      }
  
      container.appendChild(div);
    });
  
    container.scrollTop = container.scrollHeight;
    showMembers();
  }

  
  let mode = "login"; // ou "register"

function toggleMode() {
  mode = mode === "login" ? "register" : "login";
  document.querySelector("button").innerText = mode === "login" ? "Entrar" : "Cadastrar";
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("error");

  if (!username || !password) {
    error.textContent = "Preencha todos os campos.";
    return;
  }

  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (mode === "login") {
    if (users[username] && users[username] === password) {
      localStorage.setItem("currentUser", username);
      window.location.href = "decide.html";
    } else {
      error.textContent = "Usuário ou senha incorretos.";
    }
  } else {
    if (users[username]) {
      error.textContent = "Este username já existe.";
    } else {
      users[username] = password;
      localStorage.setItem("users", JSON.stringify(users));
      localStorage.setItem("currentUser", username);
      window.location.href = "decide.html";
    }
  }
}


function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
  
    // Exemplo de validação simples (você pode melhorar conforme necessário)
    if (!username || !password) {
      document.getElementById("error").textContent = "Por favor, preencha todos os campos!";
      return;
    }
  
    // Validação simples para verificar se o usuário existe e senha (você pode substituir com validação real)
    const users = JSON.parse(localStorage.getItem("users") || "{}");
  
    if (users[username] && users[username].password === password) {
      localStorage.setItem("currentUser", username);  // Salva o usuário logado
      window.location.href = "decide.html";  // Redireciona para decide.html
    } else {
      document.getElementById("error").textContent = "Usuário ou senha incorretos!";
    }
  }
  



  // Criar grupo
function createGroup() {
  const groupName = document.getElementById("newGroup").value.trim();
  if (!groupName || groupName.length < 3) {
    alert("Preencha o campo com o nome do grupo.");
    return;
  }

  // Verifica se o grupo já existe globalmente
  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "{}");
  if (allGroups[groupName]) {
    alert("Grupo já existe!");
    return;
  }

  // Cria o grupo com o usuário atual como primeiro participante
  allGroups[groupName] = [currentUser];
  localStorage.setItem("all_groups", JSON.stringify(allGroups));

  // Adiciona o grupo à lista do usuário
  groups.push(groupName);
  localStorage.setItem("groups_" + currentUser, JSON.stringify(groups));
  loadGroups();
  alert("Grupo criado com sucesso!");
  document.getElementById("newGroup").value = "";
}

// Entrar em um grupo
function joinGroup() {
  const groupToJoin = document.getElementById("groupToJoin").value.trim();
  if (!groupToJoin) {
    alert("Preencha o campo do nome do grupo!");
    return;
  }

  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "{}");
  if (!allGroups[groupToJoin]) {
    alert("Grupo inexistente!");
    return;
  }

  // Adiciona o usuário ao grupo se ainda não for participante
  if (!allGroups[groupToJoin].includes(currentUser)) {
    allGroups[groupToJoin].push(currentUser);
    localStorage.setItem("all_groups", JSON.stringify(allGroups));
  }

  // Adiciona o grupo à lista do usuário se ainda não tiver
  if (!groups.includes(groupToJoin)) {
    groups.push(groupToJoin);
    localStorage.setItem("groups_" + currentUser, JSON.stringify(groups));
    loadGroups();
  }

  alert("Você entrou no grupo: " + groupToJoin);
  openChatWith(groupToJoin);
}

// Abrir chat com o contato ou grupo
function openChatWith(contact) {
  currentChatWith = contact;
  document.getElementById("chatTitle").textContent = "Chat com " + contact;
  document.getElementById("targetUserInfo").textContent = "Com: " + contact;

  // Se for grupo, mostrar membros
  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "{}");
  if (allGroups[contact]) {
    document.getElementById("targetUserInfo").textContent = "Grupo: " + contact + "\nMembros: " + allGroups[contact].join(", ");
  }

  renderMessages();
}


function joinGroup() {
  const groupName = document.getElementById("groupToJoin").value.trim();
  if (!groupName) {
    alert("Digite o nome do grupo para entrar.");
    return;
  }

  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "[]");
  if (!allGroups.includes(groupName)) {
    alert("Grupo não existe.");
    return;
  }

  // Adiciona o grupo na lista de grupos do usuário
  const userGroups = JSON.parse(localStorage.getItem("groups_" + currentUser) || "[]");
  if (!userGroups.includes(groupName)) {
    userGroups.push(groupName);
    localStorage.setItem("groups_" + currentUser, JSON.stringify(userGroups));
  }

  // Adiciona o usuário à lista de participantes do grupo
  const participantKey = "group_participants_" + groupName;
  const participants = JSON.parse(localStorage.getItem(participantKey) || "[]");

  if (!participants.includes(currentUser)) {
    participants.push(currentUser);
    localStorage.setItem(participantKey, JSON.stringify(participants));
  }

  alert("Você entrou no grupo: " + groupName);
  document.getElementById("groupToJoin").value = "";
  loadGroups();
  openChatWith(groupName);
}


function openChatWith(groupName) {
  currentChatWith = groupName;
  document.getElementById("chatTitle").textContent = "Grupo: " + groupName;
  document.getElementById("targetUserInfo").textContent = "Você está no grupo: " + groupName;

  renderMessages();
  renderParticipants(groupName);
}


function renderParticipants(groupName) {
  const participantKey = "group_participants_" + groupName;
  const participants = JSON.parse(localStorage.getItem(participantKey) || "[]");

  const aside = document.getElementById("asideParticipants");
  aside.innerHTML = "<h3>Participantes</h3>";

  if (participants.length === 0) {
    aside.innerHTML += "<p>Nenhum participante ainda.</p>";
    return;
  }

  const ul = document.createElement("ul");
  participants.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    ul.appendChild(li);
  });

  aside.appendChild(ul);
}


const currentUser = localStorage.getItem("currentUser");
if (!currentUser) location.href = "index.html";

const users = JSON.parse(localStorage.getItem("users") || "{}");
let contacts = JSON.parse(localStorage.getItem("contacts_" + currentUser) || "[]");
let groups = JSON.parse(localStorage.getItem("groups_" + currentUser) || "[]");

let currentChatWith = null;

document.getElementById("currentUserInfo").textContent = "Você: " + currentUser;

function addContact() {
  const newUser = document.getElementById("newContact").value.trim();
  if (!newUser || newUser === currentUser) {
    alert("Preencha este campo com um username válido!");
    return;
  }
  if (!users[newUser]) {
    alert("Usuário não encontrado!");
    return;
  }
  if (!contacts.includes(newUser)) {
    contacts.push(newUser);
    localStorage.setItem("contacts_" + currentUser, JSON.stringify(contacts));
    loadContacts();
  }
  document.getElementById("newContact").value = "";
}

function loadContacts() {
  const list = document.getElementById("contactList");
  list.innerHTML = "";
  contacts.forEach(contact => {
    const div = document.createElement("div");
    div.className = "contact";
    div.textContent = contact;
    div.onclick = () => openChatWith(contact);
    list.appendChild(div);
  });
}

function openChatWith(contact) {
  currentChatWith = contact;
  document.getElementById("chatTitle").textContent = "Chat com " + contact;
  document.getElementById("targetUserInfo").textContent = "Com: " + contact;

  // Se for grupo, mostrar membros
  if (isGroup(contact)) {
    const groupData = JSON.parse(localStorage.getItem("group_" + contact));
    if (groupData) {
      document.getElementById("targetUserInfo").textContent = "Membros: " + groupData.members.join(", ");
    }
  }

  renderMessages();
}

function renderMessages() {
  const chatKey = getChatKey(currentUser, currentChatWith);
  const chat = JSON.parse(localStorage.getItem(chatKey) || "[]");
  const area = document.getElementById("messages");
  area.innerHTML = "";
  chat.forEach(msg => {
    const div = document.createElement("div");
    div.textContent = msg.sender + ": " + msg.text;
    area.appendChild(div);
  });
  area.scrollTop = area.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || !currentChatWith) return;

  const chatKey = getChatKey(currentUser, currentChatWith);
  const chat = JSON.parse(localStorage.getItem(chatKey) || "[]");
  chat.push({ sender: currentUser, text });
  localStorage.setItem(chatKey, JSON.stringify(chat));
  input.value = "";
  renderMessages();
}

function createGroup() {
  const groupName = document.getElementById("newGroup").value.trim();
  if (!groupName || groupName.length < 3) {
    alert("Preencha o campo com o nome do grupo.");
    return;
  }

  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "[]");
  if (allGroups.includes(groupName)) {
    alert("Grupo já existe!");
    return;
  }

  const groupData = {
    name: groupName,
    members: [currentUser]
  };
  localStorage.setItem("group_" + groupName, JSON.stringify(groupData));
  allGroups.push(groupName);
  localStorage.setItem("all_groups", JSON.stringify(allGroups));

  groups.push(groupName);
  localStorage.setItem("groups_" + currentUser, JSON.stringify(groups));

  loadGroups();
  alert("Grupo criado com sucesso!");
  document.getElementById("newGroup").value = "";
}

function joinGroup() {
  const groupToJoin = document.getElementById("groupToJoin").value.trim();
  if (!groupToJoin) {
    alert("Preencha o campo do nome do grupo!");
    return;
  }

  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "[]");
  if (!allGroups.includes(groupToJoin)) {
    alert("Grupo inexistente!");
    return;
  }

  const groupKey = "group_" + groupToJoin;
  const groupData = JSON.parse(localStorage.getItem(groupKey));

  if (!groupData.members.includes(currentUser)) {
    groupData.members.push(currentUser);
    localStorage.setItem(groupKey, JSON.stringify(groupData));
  }

  if (!groups.includes(groupToJoin)) {
    groups.push(groupToJoin);
    localStorage.setItem("groups_" + currentUser, JSON.stringify(groups));
  }

  loadGroups();
  alert("Você entrou no grupo: " + groupToJoin);

  openChatWith(groupToJoin); // já entra no chat ao entrar no grupo
}

function loadGroups() {
  const list = document.getElementById("groupList");
  list.innerHTML = "";
  groups.forEach(group => {
    const div = document.createElement("div");
    div.className = "group";
    div.textContent = group;
    div.onclick = () => openChatWith(group);
    list.appendChild(div);
  });
}

function getChatKey(user1, user2) {
  // Se for grupo, usa chave fixa
  if (isGroup(user2)) return "chat_group_" + user2;

  // Se for conversa privada
  return "chat_" + [user1, user2].sort().join("_");
}

function isGroup(name) {
  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "[]");
  return allGroups.includes(name);
}

// Carregar dados iniciais
loadContacts();
loadGroups();

// Entrar em grupo
function joinGroup() {
  const groupToJoin = document.getElementById("groupToJoin").value.trim();
  if (!groupToJoin) {
    alert("Preencha o campo do nome do grupo!");
    return;
  }

  const allGroups = JSON.parse(localStorage.getItem("all_groups") || "[]");
  if (!allGroups.includes(groupToJoin)) {
    alert("Grupo inexistente!");
    return;
  }

  const groupData = JSON.parse(localStorage.getItem("group_" + groupToJoin));
  if (!groupData.members.includes(currentUser)) {
    groupData.members.push(currentUser);
    localStorage.setItem("group_" + groupToJoin, JSON.stringify(groupData));
  }

  const userGroups = JSON.parse(localStorage.getItem("groups_" + currentUser) || "[]");
  if (!userGroups.includes(groupToJoin)) {
    userGroups.push(groupToJoin);
    localStorage.setItem("groups_" + currentUser, JSON.stringify(userGroups));
  }

  loadGroups();
  alert("Você entrou no grupo: " + groupToJoin);

  // Atualizar currentChatWith para o grupo
  currentChatWith = groupToJoin;
  document.getElementById("chatTitle").textContent = "Chat com " + groupToJoin;
  document.getElementById("targetUserInfo").textContent = "Membros: " + groupData.members.join(", ");
  
  // Exibir mensagens
  renderMessages();
}
