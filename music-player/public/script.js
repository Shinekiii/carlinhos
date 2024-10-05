let player;
let playlist = []; // Variável global para armazenar a playlist
const apiKey = 'YOUR_API_KEY';  // Substitua pela sua API Key do YouTube

// Carrega a API do YouTube
function onYouTubeIframeAPIReady() {
    fetch('/api/playlist')
        .then(response => response.json())
        .then(data => {
            playlist = data;  // Atualiza a variável global playlist
            player = new YT.Player('player', {
                height: '360',
                width: '640',
                videoId: playlist.length > 0 ? playlist[0].id : null,
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        });
}

// Adiciona músicas na fila pelo nome
function searchAndAddVideo() {
    const videoName = document.getElementById('videoNameInput').value.trim();
    if (videoName) {
        searchVideoByName(videoName);
    }
}

// Busca músicas pelo nome
function searchVideoByName(name) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(name)}&type=video&key=${apiKey}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.items.length > 0) {
                const video = data.items[0];
                const videoId = video.id.videoId;
                const videoTitle = video.snippet.title;
                addVideoToQueue(videoId, videoTitle);
            } else {
                alert('Nenhum vídeo encontrado.');
            }
        })
        .catch(error => {
            console.error('Erro na busca do vídeo:', error);
        });
}

// Adiciona músicas na fila
function addVideoToQueue(videoId, videoTitle) {
    if (videoId) {
        fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId, videoTitle })
        })
        .then(response => response.json())
        .then(() => {
            updatePlaylistDisplay();
            if (player && playlist.length === 1) {
                playVideo();  // Toca o vídeo adicionado se for o único na fila
            }
            document.getElementById('videoNameInput').value = '';
        })
        .catch(error => {
            console.error('Erro ao adicionar o vídeo:', error);
        });
    }
}

// Atualiza a exibição da playlist
function updatePlaylistDisplay() {
    fetch('/api/playlist')
        .then(response => response.json())
        .then(data => {
            playlist = data;  // Atualiza a playlist
            const playlistUl = document.getElementById('playlist');
            playlistUl.innerHTML = '';  // Limpa a lista atual
            playlist.forEach(video => {
                const li = document.createElement('li');
                li.textContent = video.title;
                playlistUl.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Erro ao atualizar a exibição da playlist:', error);
        });
}

// Função chamada quando o player está pronto
function onPlayerReady(event) {
    playVideo();
}

// Função chamada quando o estado do player muda
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        nextVideo();
    }
}

// Reproduz o vídeo atual
function playVideo() {
    if (playlist.length > 0) {
        player.loadVideoById(playlist[0].id);
        player.playVideo();
    }
}

// Pula a música atual
function skipCurrent() {
    nextVideo();  // Chama diretamente a função nextVideo
}

// Avança para a próxima música
function nextVideo() {
    fetch('/api/playlist/next', { method: 'POST' })
        .then(response => response.json())
        .then(() => {
            updatePlaylistDisplay();  // Atualiza a interface da playlist
            playVideo();  // Toca o próximo vídeo
        })
        .catch(error => {
            console.error('Erro ao pular o vídeo:', error);
        });
}

// Verifica se a música está terminando
function checkIfShouldSkip() {
    if (player && player.getVideoLoadedFraction() > 0) {
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        if (duration - currentTime <= 1) {
            nextVideo();
        }
    }
}

// Verifica se deve pular a música
setInterval(checkIfShouldSkip, 1000);

// Adiciona o Enter para adicionar vídeos
document.getElementById('videoNameInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchAndAddVideo();
    }
});

// Alterna o tema claro/escuro
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('light')) {
        body.classList.remove('light');
        body.classList.add('dark');
    } else {
        body.classList.remove('dark');
        body.classList.add('light');
    }
}

// Carrega a API do YouTube
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Inicia a API do YouTube e carrega a playlist
loadYouTubeAPI();
updatePlaylistDisplay();  // Atualiza a playlist diretamente da API
