const { app, BrowserWindow, globalShortcut } = require('electron');
const { exec } = require('child_process');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Carlinhos_Bot',
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    mainWindow.loadURL('http://localhost:3000');  // Carrega o index principal do bot
}

app.whenReady().then(() => {
    createWindow();

    // Registra o atalho global para CTRL + Setinha para Direita
    globalShortcut.register('Control+Right', () => {
        // Envia uma requisição para pular a música
        fetch('http://localhost:3000/api/playlist/next', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                console.log('Música pulada:', data.message);
            })
            .catch(error => {
                console.error('Erro ao pular música:', error);
            });
    });

    // Inicia o servidor da música no subdiretório music-player
    exec('node music-player/server.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao iniciar server.js: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
