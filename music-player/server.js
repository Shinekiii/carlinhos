const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware para processar JSON
app.use(express.json());

// Serve arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'start.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para obter a lista de vídeos da playlist
app.get('/api/playlist', (req, res) => {
    try {
        const playlist = getPlaylistFromLocalStorage();
        res.json(playlist);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter a playlist.' });
    }
});

// Rota para adicionar um vídeo à playlist
app.post('/api/playlist', (req, res) => {
    const { videoId, videoTitle } = req.body;
    if (!videoId || !videoTitle) {
        return res.status(400).json({ error: 'videoId e videoTitle são necessários' });
    }

    try {
        const playlist = getPlaylistFromLocalStorage();

        // Verifica se o vídeo já está na playlist
        if (playlist.some(video => video.id === videoId)) {
            return res.status(400).json({ error: 'Vídeo já está na playlist' });
        }

        playlist.push({ id: videoId, title: videoTitle });
        savePlaylistToLocalStorage(playlist);
        res.status(201).json({ message: 'Vídeo adicionado à playlist' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar o vídeo à playlist.' });
    }
});

// Rota para pular para o próximo vídeo
app.post('/api/playlist/next', (req, res) => {
    try {
        const playlist = getPlaylistFromLocalStorage();
        if (playlist.length > 0) {
            playlist.splice(0, 1);  // Remove o primeiro vídeo da lista
            savePlaylistToLocalStorage(playlist);
            res.json({ message: 'Próximo vídeo' });
        } else {
            res.status(400).json({ message: 'A playlist está vazia' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao pular para o próximo vídeo.' });
    }
});

// Função para salvar a playlist no localStorage (simulada para o servidor)
function savePlaylistToLocalStorage(playlist) {
    try {
        fs.writeFileSync('playlist.json', JSON.stringify(playlist));
    } catch (error) {
        console.error('Erro ao salvar a playlist:', error);
    }
}

// Função para obter a playlist do localStorage (simulada para o servidor)
function getPlaylistFromLocalStorage() {
    try {
        if (fs.existsSync('playlist.json')) {
            const playlist = fs.readFileSync('playlist.json');
            return JSON.parse(playlist);
        }
    } catch (error) {
        console.error('Erro ao ler a playlist:', error);
    }
    return [];
}

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
