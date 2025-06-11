// server.js - A ponte entre o n8n e a sua tela interativa.

const express = require('express');
const http = require('http');
const path = require('path'); // Biblioteca para lidar com caminhos de arquivos
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// --- SERVINDO OS ARQUIVOS ESTÁTICOS (HTML, CSS, JS) ---
// Esta linha diz ao servidor para entregar os arquivos que estão dentro da pasta 'public'.
// É por isso que movemos os arquivos para lá.
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Tela da Pokédex conectou-se ao WebSocket!');
});

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// O endpoint para o n8n continua o mesmo.
app.post('/capture', (req, res) => {
    console.log('Dados recebidos do n8n:', req.body);
    broadcast(req.body);
    res.status(200).send('Dados recebidos e retransmitidos para a tela!');
});

// O Render (serviço de publicação) usa a variável de ambiente PORT.
// Se não existir (rodando localmente), ele usa a porta 3000.
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor iniciado e ouvindo na porta ${PORT}.`);
});