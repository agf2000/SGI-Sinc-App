'use strict'

const {
    ipcRenderer,
    remote
} = eRequire('electron');

$(function () {

    $('#msg').html(`Versão instalada: ${remote.app.getVersion()}`);

    $('#btnUpdate').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        ipcRenderer.send('checkForUpdates', '');
    });

    $('#btnCancel').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let win = remote.getCurrentWindow();
        win.close();
    });

});

ipcRenderer.on('update-content', (event, arg) => {
    $('#msg').html(arg);
});