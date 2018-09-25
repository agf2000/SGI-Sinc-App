const electron = require('electron');
const {
    app,
    BrowserWindow,
    Menu,
    ipcMain
} = electron;
const path = require('path');
const fse = require('fs-extra');
const destPath = 'c:\\softer\\config';
const devToolsInstaller = require('electron-devtools-installer');
const {
    autoUpdater
} = require('electron-updater');
const log = require('electron-log');

let mainWindow = null,
    serversWindow = null,
    tablesWindow = null,
    syncsWindow = null,
    configWindow = null,
    onlineStatusWindow = null;

// configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

const io = require('socket.io-client');

let socket = io("http://softersgi.dnns.com.br:3000");

fse.readFile(`${destPath}\\config.json`, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let fileRead = fse.readFileSync(`${destPath}\\config.json`, 'utf8');
    config = JSON.parse(fileRead);

    socket = io(config.broadServer);
});

// Listen for the app to be ready
function createWindow() {

    devToolsInstaller.default(devToolsInstaller.REDUX_DEVTOOLS);

    mainWindow = new BrowserWindow({
        title: "SGI Sincronizador",
        // x: 0,
        // y: 10,
        // autoHideMenuBar: true,
        // minimizable: false,
        width: 800,
        height: 620,
        resizable: false,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    mainWindow.loadURL('file://' + __dirname + '/html/mainWindow.html');

    // Built menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

    // Insert menu
    Menu.setApplicationMenu(mainMenu);

    // Open developer tools if not in production
    // if (process.env.NODE_ENV !== 'production') {
    //     mainWindow.webContents.openDevTools({
    //         mode: 'detach'
    //     });
    // }

    // function openSyncsWindow() {
    //     event.sender.send('openSyncsWindow');
    // };

    // socket.on('welcome', () => {
    //     console.log('welcome received'); // displayed
    //     socket.emit('test')
    // });

    // socket.on('error', (e) => {
    //     console.log(e); // not displayed
    // });

    // socket.on('connect', () => {
    //     console.log("connected"); // displayed
    // });

    // socket.on('messages', (e) => {
    //     console.log(e); // displayed
    // });
};

// Create menu template
// vscode-fold=1
const mainMenuTemplate = [{
    label: 'Aplicativo',
    submenu: [{
        label: 'Configuração',
        submenu: [{
            label: 'Servidores',
            accelerator: process.platform === 'darwin' ? 'Command+S' : 'Ctrl+S',
            click(item, focusedWindow) {
                if (focusedWindow) openServersWindow();
            }
        }, {
            label: 'Tabelas',
            accelerator: process.platform === 'darwin' ? 'Command+T' : 'Ctrl+T',
            click(item, focusedWindow) {
                if (focusedWindow) openTablesWindow();
            }
        }, {
            label: 'Exceções',
            accelerator: process.platform === 'darwin' ? 'Command+Y' : 'Ctrl+E',
            click(item, focusedWindow) {
                if (focusedWindow) openSyncsWindow();
            }
        }, {
            label: 'Configurações',
            accelerator: process.platform === 'darwin' ? 'Command+Y' : 'Ctrl+G',
            click(item, focusedWindow) {
                if (focusedWindow) openConfigWindow();
            }
        }]
    }, {
        type: 'separator'
    }, {
        label: 'Comunicar Início',
        accelerator: process.platform === 'darwin' ? 'Command+Y' : 'Ctrl+I',
        click(item, focusedWindow) {
            focusedWindow.webContents.send('startSyncComunication');
            // let msg = {
            //     username: os.userInfo().username,
            //     message: 'syncing'
            // };
            // socket.emit('messages', JSON.stringify(msg));
            // dialog.showMessageBox({
            //     title: "Informativo",
            //     message: "Notificação enviada!",
            //     buttons: ["OK"]
            // });
        }
    }, {
        label: 'Comunicar Término',
        accelerator: process.platform === 'darwin' ? 'Command+Y' : 'Ctrl+F',
        click(item, focusedWindow) {
            focusedWindow.webContents.send('endSyncComunication');
            // let msg = {
            //     username: os.userInfo().username,
            //     message: 'doneSyncing'
            // };
            // socket.emit('messages', JSON.stringify(msg));
            // dialog.showMessageBox({
            //     title: "Informativo",
            //     message: "Notificação enviada!",
            //     buttons: ["OK"]
            // });
        }
    }, {
        type: 'separator'
    }, {
        label: 'Recarregar',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
        }
    }]
}, {
    label: 'Ferramentas',
    submenu: [{
        label: 'Diagnóstico',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        }
    }]
}, {
    label: 'Sair',
    click() {
        app.quit();
    }
}, {
    label: 'Sobre',
    click(item, focusedWindow) {
        openAboutWindow();
    }
}];

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// Create menu template
// vscode-fold=4
const serverMenuTemplate = [{
        label: 'Recarregar',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
        }
    }, {
        label: 'Ferramentas',
        submenu: [{
            label: 'Diagnóstico',
            accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click(item, focusedWindow) {
                if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
        }]
    },
    {
        label: 'Fechar',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.close()
        }

    }
];

// Open developer tools if not in production
// vscode-fold=5
// if (process.env.NODE_ENV !== 'production') {
//     serverMenuTemplate.push({
//         label: 'Ferramentas',
//         submenu: [{
//             label: 'Toggle Dev Tools',
//             accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
//             click(item, focusedWindow) {
//                 if (focusedWindow) focusedWindow.webContents.toggleDevTools()
//             }
//         }]
//     })
// };

// vscode-fold=6
function openServersWindow() {
    if (serversWindow) {
        serversWindow.focus()
        return;
    }

    serversWindow = new BrowserWindow({
        title: "Conexão com Servidores",
        minimizable: false,
        parent: mainWindow,
        fullscreenable: false,
        width: 760,
        height: 580,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    serversWindow.setMenu(null);

    serversWindow.loadURL('file://' + __dirname + '/html/servers.html');

    const serverMenu = Menu.buildFromTemplate(serverMenuTemplate);

    // // Insert menu
    serversWindow.setMenu(serverMenu);

    serversWindow.on('closed', function () {
        // mainWindow.reload();
        serversWindow = null;
    });

    // Open developer tools if not in production
    // if (process.env.NODE_ENV !== 'production') {
    //     serversWindow.webContents.openDevTools({
    //         mode: 'detach'
    //     });
    // }
};

// Create menu template
// vscode-fold=7
const tableMenuTemplate = [{
        label: 'Recarregar',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
        }
    }, {
        label: 'Ferramentas',
        submenu: [{
            label: 'Diagnóstico',
            accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click(item, focusedWindow) {
                if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
        }]
    },
    {
        label: 'Fechar',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.close()
        }
    }
];

// Open developer tools if not in production
// vscode-fold=8
// if (process.env.NODE_ENV !== 'production') {
//     tableMenuTemplate.push({
//         label: 'Ferramentas',
//         submenu: [{
//             label: 'Toggle Dev Tools',
//             accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
//             click(item, focusedWindow) {
//                 if (focusedWindow) focusedWindow.webContents.toggleDevTools()
//             }
//         }]
//     })
// };

// vscode-fold=9
function openTablesWindow() {

    if (tablesWindow) {
        tablesWindow.focus()
        return;
    }

    tablesWindow = new BrowserWindow({
        title: "Tabelas",
        minimizable: false,
        parent: mainWindow,
        fullscreenable: false,
        width: 740,
        height: 560,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    tablesWindow.setMenu(null);

    tablesWindow.loadURL('file://' + __dirname + '/html/tables.html');

    const tableMenu = Menu.buildFromTemplate(tableMenuTemplate);

    // // Insert menu
    tablesWindow.setMenu(tableMenu);

    tablesWindow.on('closed', function () {
        // mainWindow.reload();
        tablesWindow = null;
    });

    // Open developer tools if not in production
    // if (process.env.NODE_ENV !== 'production') {
    //     tablesWindow.webContents.openDevTools({
    //         mode: 'detach'
    //     });
    // }
};

// Create menu template
// vscode-fold=10
const syncsMenuTemplate = [{
        label: 'Recarregar',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
        }
    }, {
        label: 'Ferramentas',
        submenu: [{
            label: 'Diagnóstico',
            accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click(item, focusedWindow) {
                if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
        }]
    },
    {
        label: 'Fechar',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.close()
        }
    }
];

// Open developer tools if not in production
// vscode-fold=11
// if (process.env.NODE_ENV !== 'production') {
//     syncsMenuTemplate.push({
//         label: 'Ferramentas',
//         submenu: [{
//             label: 'Toggle Dev Tools',
//             accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
//             click(item, focusedWindow) {
//                 if (focusedWindow) focusedWindow.webContents.toggleDevTools()
//             }
//         }]
//     })
// };

// vscode-fold=8
function openSyncsWindow() {

    if (syncsWindow) {
        syncsWindow.focus()
        return;
    }

    syncsWindow = new BrowserWindow({
        title: "Exceções",
        minimizable: false,
        parent: mainWindow,
        fullscreenable: false,
        width: 660,
        height: 520,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    syncsWindow.setMenu(null);

    syncsWindow.loadURL('file://' + __dirname + '/html/syncs.html');

    const syncsMenu = Menu.buildFromTemplate(syncsMenuTemplate);

    // // Insert menu
    syncsWindow.setMenu(syncsMenu);

    syncsWindow.on('closed', function () {
        // mainWindow.reload();
        syncsWindow = null;
    });

    // Open developer tools if not in production
    // if (process.env.NODE_ENV !== 'production') {
    //     syncsWindow.webContents.openDevTools({
    //         mode: 'detach'
    //     });
    // }
};

// Configurações menu
const configMenuTemplate = [{
        label: 'Recarregar',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
        }
    }, {
        label: 'Ferramentas',
        submenu: [{
            label: 'Diagnóstico',
            accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click(item, focusedWindow) {
                if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
        }]
    },
    {
        label: 'Fechar',
        click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.close()
        }
    }
];

// Configurações
function openConfigWindow() {
    if (configWindow) {
        configWindow.focus()
        return;
    }

    configWindow = new BrowserWindow({
        title: "Configurações",
        minimizable: false,
        parent: mainWindow,
        fullscreenable: false,
        width: 660,
        height: 520,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    configWindow.setMenu(null);

    configWindow.loadURL('file://' + __dirname + '/html/config.html');

    const configMenu = Menu.buildFromTemplate(configMenuTemplate);

    // // Insert menu
    configWindow.setMenu(configMenu);

    configWindow.on('closed', function () {
        // mainWindow.reload();
        configWindow = null;
    });

    // Open developer tools if not in production
    // if (process.env.NODE_ENV !== 'production') {
    //     configWindow.webContents.openDevTools({
    //         mode: 'detach'
    //     });
    // }
};

function openAboutWindow() {
    aboutWindow = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        show: false,
        // x: 0,
        // y: 0,
        // frame: false,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        minimizable: false,
        width: 440,
        height: 360,
        resizable: false,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    aboutWindow.loadURL('file://' + __dirname + '/html/about.html');

    aboutWindow.once('ready-to-show', () => {
        aboutWindow.show();
    });
};

//-------------------------------------------------------------------
// Auto updates
//-------------------------------------------------------------------
const sendStatusToWindow = (text) => {
    log.info(text);
    aboutWindow.webContents.send('update-content', text);
};

ipcMain.on('checkForUpdates', checkForUpdates);

function checkForUpdates() {
    // trigger autoupdate check
    autoUpdater.checkForUpdates();
};

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Procurando por atualização...');
});

autoUpdater.on('update-available', info => {
    sendStatusToWindow('Atualização disponível.');
});

autoUpdater.on('update-not-available', info => {
    sendStatusToWindow('Atualização não disponível.');
});

autoUpdater.on('error', err => {
    sendStatusToWindow(`Error no atualizador: ${err.toString()}`);
});

autoUpdater.on('download-progress', progressObj => {
    sendStatusToWindow(
        `Velocidade: ${formatBytes(progressObj.bytesPerSecond)} /seg
         <br />Baixado: ${progressObj.percent.toFixed(2)}%
         <br />(${formatBytes(progressObj.transferred)} de ${formatBytes(progressObj.total)} + )`
    );
});

autoUpdater.on('update-downloaded', info => {
    sendStatusToWindow('Atualização baixada; Começando a atualização...');
});

autoUpdater.on('update-downloaded', info => {
    // Wait 5 seconds, then quit and install
    // In your application, you don't need to wait 500 ms.
    // You could call autoUpdater.quitAndInstall(); immediately
    autoUpdater.quitAndInstall();
});

// Listen for the app to be ready
// vscode-fold=2
app.on('ready', createWindow);

function formatBytes(bytes, decimals) {
    if (bytes == 0) return '0 Bytes';
    var k = 1024,
        dm = decimals <= 0 ? 0 : decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}