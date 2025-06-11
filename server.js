// server.js - A ponte entre o n8n e a sua tela interativa.

// Importa as bibliotecas necessárias que instalamos com o 'npm'.
const express = require('express');
const http = require('http');
const path = require('path'); // Biblioteca para lidar com caminhos de arquivos
const WebSocket = require('ws');

// Cria uma aplicação 'Express', um framework para criar servidores web de forma fácil.
const app = express();
// Configura o 'Express' para entender requisições que enviam dados em formato JSON.
app.use(express.json());

// --- SERVINDO OS ARQUIVOS ESTÁTICOS (HTML, CSS, JS) ---
// Esta linha diz ao servidor para entregar os arquivos que estão dentro da pasta 'public'.
app.use(express.static(path.join(__dirname, 'public')));

// Cria um servidor HTTP padrão do Node.js usando a aplicação 'Express'.
const server = http.createServer(app);
// Anexa um servidor WebSocket ao nosso servidor HTTP. Eles vão compartilhar a mesma porta.
const wss = new WebSocket.Server({ server });

// Este evento é disparado toda vez que uma nova página (um novo cliente) se conecta ao WebSocket.
wss.on('connection', (ws) => {
    // Exibe uma mensagem no console do servidor para sabermos que a tela conectou.
    console.log('Tela da Pokédex conectou-se ao WebSocket!');

    // --- LÓGICA DE PING-PONG PARA MANTER A CONEXÃO VIVA ---
    // Este evento é disparado toda vez que o servidor recebe uma mensagem do cliente (a tela).
    ws.on('message', (message) => {
        try {
            // Tenta decodificar a mensagem.
            const data = JSON.parse(message);
            // Verifica se a mensagem é do tipo 'ping'.
            if (data.type === 'ping') {
                // Se for, responde com uma mensagem 'pong'.
                // Isso confirma que a conexão está ativa nos dois sentidos.
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {
            // Apenas ignora mensagens que não sejam no formato JSON esperado.
        }
    });

    // Evento para quando a conexão é fechada.
    ws.on('close', () => {
        console.log('Tela da Pokédex desconectou-se.');
    });
});

/**
 * Função que envia uma mensagem para TODAS as telas que estiverem conectadas.
 * @param {object} data - Os dados a serem enviados (ex: {action: 'new_capture', ...}).
 */
function broadcast(data) {
    // Percorre a lista de todos os clientes conectados.
    wss.clients.forEach((client) => {
        // Verifica se a conexão do cliente está aberta e pronta para receber mensagens.
        if (client.readyState === WebSocket.OPEN) {
            // Converte o objeto de dados para uma string JSON e o envia.
            client.send(JSON.stringify(data));
        }
    });
}

// O endpoint que o n8n vai chamar continua o mesmo.
app.post('/capture', (req, res) => {
    // Exibe no console do servidor os dados que o n8n acabou de enviar.
    console.log('Dados recebidos do n8n:', req.body);
    // Chama a função 'broadcast' para retransmitir esses dados para a nossa página da Pokédex.
    broadcast(req.body);
    // Envia uma resposta de volta para o n8n, dizendo que os dados foram recebidos com sucesso.
    res.status(200).send('Dados recebidos e retransmitidos para a tela!');
});

// O Render (serviço de publicação) usa a variável de ambiente PORT.
// Se não existir (rodando localmente), ele usa a porta 3000.
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor iniciado e ouvindo na porta ${PORT}.`);
    console.log(`O n8n deve enviar requisições para: http://IP_DA_REDE_LOCAL:${PORT}/capture`);
});