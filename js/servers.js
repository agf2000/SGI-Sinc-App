const {
    ipcRenderer,
    remote
} = eRequire('electron');
const os = eRequire('os');
const fse = eRequire('fs-extra');
const _ = eRequire("lodash");
const moment = eRequire('moment');
const sqlDb = eRequire("mssql");

const storage = eRequire('electron-json-storage');

let destPath = 'c:\\softer\\Sincronizador\\config';

let connOrigin = `${destPath}\\dbOrigin.json`;

// let stack_bottomright = {
//     "dir1": "down",
//     "dir2": "right",
//     "push": "top"
// };

fse.readFile(connOrigin, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let dbOrigin = fse.readFileSync(connOrigin, 'utf8');
    dbOrigin = JSON.parse(dbOrigin);
    $('#serverOrigin').val(dbOrigin.server);
    $('#portOrigin').val(dbOrigin.port);
    $('#dbOrigin').val(dbOrigin.database);
    $('#userOrigin').val(dbOrigin.user);
    $('#passwordOrigin').val(dbOrigin.password);
    Materialize.updateTextFields();
});

let connDest = `${destPath}\\dbDest.json`;

fse.readFile(connDest, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let dbDest = fse.readFileSync(connDest, 'utf8');
    dbDest = JSON.parse(dbDest);
    $('#serverDest').val(dbDest.server);
    $('#portDest').val(dbDest.port);
    $('#dbDest').val(dbDest.database);
    $('#userDest').val(dbDest.user);
    $('#passwordDest').val(dbDest.password);
    Materialize.updateTextFields();
});

$(function () {

    // console.log(destPath);
    storage.setDataPath(destPath);

    $('#btnSaveOrigin').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = $(this);
        $($btn).attr('disabled', true);

        let params = {
            user: $('#userOrigin').val(),
            password: $('#passwordOrigin').val(),
            server: $('#serverOrigin').val(),
            port: $('#portOrigin').val(),
            database: $('#dbOrigin').val(),
            connectionTimeout: 500000,
            requestTimeout: 500000,
            pool: {
                idleTimeoutMillis: 500000,
                max: 100
            }
        };

        if ($('#portOrigin').val() !== '1433') {
            params.server = $('#serverOrigin').val().split('\\')[0],
                params.dialectOptions = {
                    instanceName: $('#serverOrigin').val().split('\\')[1]
                }
        }

        sqlDb.connect(params, function (err) {
            sqlDb.close();

            if (err) {
                console.log(err);
                new PNotify({
                    title: "Erro",
                    text: err,
                    type: 'error',
                    icon: false,
                    addclass: "stack-bottomright"
                });
                $($btn).attr('disabled', false);
                return;
            };

            if ($('#portOrigin').val() == '1433')
                params.server = $('#serverOrigin').val().replace(/\\/g, "\\");

            storage.set('dbOrigin', params, function (error) {
                if (error)
                    throw error;
            });

            new PNotify({
                title: "Sucesso",
                text: "Banco de dados de origem conectado. Lembre de recarregar a tela principal.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright"
            });

            $btn.prop('disabled', false);
        });
    });

    $('#btnSaveDest').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = $(this);
        $($btn).attr('disabled', true);

        let params = {
            user: $('#userDest').val(),
            password: $('#passwordDest').val(),
            server: $('#serverDest').val(),
            port: $('#portDest').val(),
            database: $('#dbDest').val(),
            connectionTimeout: 500000,
            requestTimeout: 500000,
            pool: {
                idleTimeoutMillis: 500000,
                max: 100
            }
        };

        if ($('#portDest').val() !== '1433') {
            params.server = $('#serverDest').val().split('\\')[0],
                params.dialectOptions = {
                    instanceName: $('#serverDest').val().split('\\')[1]
                }
        }

        sqlDb.connect(params, function (err) {
            sqlDb.close();

            if (err) {
                console.log(err);
                new PNotify({
                    title: "Erro",
                    text: err,
                    type: 'error',
                    icon: false,
                    addclass: "stack-bottomright"
                });
                $($btn).attr('disabled', false);
                return;
            };

            if ($('#portDest').val() == '1433')
                params.server = $('#serverDest').val().replace(/\\/g, "\\");

            storage.set('dbDest', params, function (error) {
                if (error)
                    throw error;
            });

            new PNotify({
                title: "Sucesso",
                text: "Banco de dados de destino conectado. Lembre de recarregar a tela principal.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright"
            });

            $btn.prop('disabled', false);
        });
    });
});