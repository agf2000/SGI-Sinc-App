const electron = require('electron');
const url = require('url');
const path = require('path');
const devToolsInstaller = require('electron-devtools-installer');

const {
    app,
    BrowserWindow,
    Menu
} = electron;

let mainWindow = null,
    serversWindow = null,
    tablesWindow = null,
    syncsWindow = null;

// Listen for the app to be ready
// vscode-fold=0
function createWindow() {

    devToolsInstaller.default(devToolsInstaller.REDUX_DEVTOOLS);

    mainWindow = new BrowserWindow({
        title: "SGI Sincronizador",
        x: 0,
        y: 10,
        // autoHideMenuBar: true,
        // minimizable: false,
        width: 800,
        height: 620,
        resizable: false,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Built menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

    // Insert menu
    Menu.setApplicationMenu(mainMenu);

    if (process.env.NODE_ENV !== 'production') {
        mainWindow.webContents.openDevTools({
            mode: 'detach'
        });
    }

    // function openSyncsWindow() {
    //     event.sender.send('openSyncsWindow');
    // };
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
                    },
                    {
                        label: 'Tabelas',
                        accelerator: process.platform === 'darwin' ? 'Command+T' : 'Ctrl+T',
                        click(item, focusedWindow) {
                            if (focusedWindow) openTablesWindow();
                        }
                    },
                    {
                        label: 'Exceções',
                        accelerator: process.platform === 'darwin' ? 'Command+Y' : 'Ctrl+Y',
                        click(item, focusedWindow) {
                            if (focusedWindow) openSyncsWindow();
                            // focusedWindow.webContents.send('openSyncsWindow');
                        }
                    }
                ]
            },
            {
                label: 'Recarregar',
                accelerator: 'CmdOrCtrl+R',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload()
                }
            }
        ]
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
        label: 'Sair',
        click() {
            app.quit();
        }
    }
];

// Listen for the app to be ready
// vscode-fold=2
app.on('ready', createWindow);

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

// Open developer tools if not in production
// vscode-fold=3
// if (process.env.NODE_ENV !== 'production') {
//     mainMenuTemplate.push({
//         label: 'Ferramentas',
//         submenu: [{
//             label: 'Toggle Dev Tools',
//             accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
//             click(item, focusedWindow) {
//                 if (focusedWindow) focusedWindow.webContents.toggleDevTools()
//             }
//         }]
//     })
// }

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

// vscode-fold=5
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
        height: 480,
        // autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    serversWindow.setMenu(null);

    serversWindow.loadURL('file://' + __dirname + '/servers.html');

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
    // mode: 'detach'
    // });
    // }
};

// Create menu template
// vscode-fold=6
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

// vscode-fold=6
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
        // autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    tablesWindow.setMenu(null);

    tablesWindow.loadURL('file://' + __dirname + '/tables.html');

    const tableMenu = Menu.buildFromTemplate(tableMenuTemplate);

    // // Insert menu
    tablesWindow.setMenu(tableMenu);

    tablesWindow.on('closed', function () {
        // mainWindow.reload();
        tablesWindow = null;
    });

    // Open developer tools if not in production
    // if (process.env.NODE_ENV !== 'production') {
    //     tablesWindow.webContents.openDevTools();
    // }
};

// Create menu template
// vscode-fold=7
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
        height: 480,
        // autoHideMenuBar: true,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    syncsWindow.setMenu(null);

    syncsWindow.loadURL('file://' + __dirname + '/syncs.html');

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