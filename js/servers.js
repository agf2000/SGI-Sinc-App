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

let destPath = os.tmpdir() + '\\tables';

let connOrigin = `${destPath}\\dbOrigin.json`;

let stack_bottomright = {
    "dir1": "down",
    "dir2": "right",
    "push": "top"
};

fse.readFile(connOrigin, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let dbOrigin = fse.readFileSync(connOrigin, 'utf8');
    dbOrigin = JSON.parse(dbOrigin);
    $('#serverOrigin').val(dbOrigin.server);
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
    $('#dbDest').val(dbDest.database);
    $('#userDest').val(dbDest.user);
    $('#passwordDest').val(dbDest.password);
    Materialize.updateTextFields();
});

$(function () {

    // console.log(os.tmpdir());
    fse.mkdirsSync(destPath);

    // console.log(destPath);
    storage.setDataPath(destPath);

    $('#btnSaveOrigin').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $this = $(this);

        let params = {
            user: $('#userOrigin').val(),
            password: $('#passwordOrigin').val(),
            server: $('#serverOrigin').val(),
            database: $('#dbOrigin').val(),
            connectionTimeout: 500000,
            requestTimeout: 500000,
            pool: {
                idleTimeoutMillis: 500000,
                max: 100
            }
        }

        sqlDb.connect(params, function (err) {
            sqlDb.close();

            if (err) {
                console.log(err);
                return;
            };

            params.server = $('#serverOrigin').val().replace(/\\/g, "\\");

            storage.set('dbOrigin', params, function (error) {
                if (error)
                    throw error;
            });

            new PNotify({
                title: "Sucesso",
                text: "Banco de dados de origem conectado.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright
            });

            $this.prop('disabled', false);
        });
    });

    $('#btnSaveDest').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $this = $(this);

        let params = {
            user: $('#userDest').val(),
            password: $('#passwordDest').val(),
            server: $('#serverDest').val(),
            database: $('#dbDest').val(),
            connectionTimeout: 500000,
            requestTimeout: 500000,
            pool: {
                idleTimeoutMillis: 500000,
                max: 100
            }
        }

        sqlDb.connect(params, function (err) {
            sqlDb.close();

            if (err) {
                console.log(err);
                return;
            };

            params.server = $('#serverDest').val().replace(/\\/g, "\\");

            storage.set('dbDest', params, function (error) {
                if (error)
                    throw error;
            });

            new PNotify({
                title: "Sucesso",
                text: "Banco de dados de destino conectado.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright
            });

            $this.prop('disabled', false);
        });
    });
});