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

let destPath = 'c:\\softer\\Sincronizador\\config',
    dbOrigin = {},
    dbDest = {},
    config = null;

var stack_topleft = {
    "dir1": "down",
    "dir2": "right",
    "push": "top"
};

$(document).ready(function () {
    storage.setDataPath(destPath);

    $('#syncsModal, #syncsPasswordModal').modal();

    $('#selectGroups').material_select();
    $('#selectCategories').material_select();

    fse.readFile(`${destPath}\\dbDest.json`, function (err, data) {
        if (err) {
            $('.btn').removeClass('disabled');
            new PNotify({
                title: "Atenção",
                text: "Favor configrar o servidor de destino.",
                type: 'warning',
                icon: false,
                addclass: "stack-bottomright"
            });
            $('.btn').addClass('disabled');
            return console.log(err);
        }
        $('#btnBackup').removeClass('disabled');
        let fileRead = fse.readFileSync(`${destPath}\\dbDest.json`, 'utf8');
        dbDest = JSON.parse(fileRead);
        setTimeout(() => {
            sqlConnectGroups();
        }, 500);
    });

    fse.readFile(`${destPath}\\dbOrigin.json`, function (err, data) {
        if (err) {
            $('.btn').removeClass('disabled');
            new PNotify({
                title: "Atenção",
                text: "Favor configrar o servidor de origem.",
                type: 'warning',
                icon: false,
                addclass: "stack-bottomright"
            });
            $('.btn').addClass('disabled');
            return console.log(err);
        }
        $('#btnBackup').removeClass('disabled');
        let fileRead = fse.readFileSync(`${destPath}\\dbOrigin.json`, 'utf8');
        dbOrigin = JSON.parse(fileRead);
        setTimeout(() => {
            sqlConnectCategories();
        }, 500);
    });

    fse.readFile(`${destPath}\\config.json`, function (err, data) {
        if (err) {
            return console.log(err);
        }
        let fileRead = fse.readFileSync(`${destPath}\\config.json`, 'utf8');
        config = JSON.parse(fileRead);

        $('#syncStock').prop('checked', config.syncStock);
        $('#syncActive').prop('checked', config.syncActive);
        $('#syncNewPeople').prop('checked', config.syncNewPeople);
        $('#syncNewProducts').prop('checked', config.syncNewProducts);
        $('#syncNewItems').prop('checked', config.syncNewItems);
        $('#syncComission').prop('checked', config.syncComission);
        $('#canSync').prop('checked', config.canSync);
        $('#canRep').prop('checked', config.canRep);
        $('#syncCost').prop('checked', config.syncCost);
        $('#syncPrice').prop('checked', config.syncPrice);

        if (config.syncGroup)
            $('#selectGroups').text(config.syncGroup);

        if (config.syncCategory)
            $('#selectCategories').text(config.syncCategory);
    });

    // Alter sync click
    $('#btnSyncs').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        if ($('#syncsPasswd').val() == 'sftk123') {
            $('#syncsPasswordModal').modal('close');

            let params = {
                syncStock: $('#syncStock').prop('checked'),
                syncActive: $('#syncActive').prop('checked'),
                syncNewItems: $('#syncNewItems').prop('checked'),
                syncNewPeople: $('#syncNewPeople').prop('checked'),
                syncNewProducts: $('#syncNewProducts').prop('checked'),
                syncComission: $('#syncComission').prop('checked'),
                syncCost: $('#syncCost').prop('checked'),
                syncPrice: $('#syncPrice').prop('checked'),
                canSync: $('#canSync').prop('checked'),
                canRep: $('#canRep').prop('checked'),
                syncGroup: (parseInt($('#selectGroups option:selected').val()) > 0 ? $('#selectGroups option:selected').text() : ''),
                syncCategory: (parseInt($('#selectCategories option:selected').val()) > 0 ? $('#selectCategories').find(':selected').data('abbvr') : ''),
                broadServer: config.broadServer,
                allowNoti: config.allowNoti
            };

            storage.set('config', params, function (error) {
                if (error)
                    throw error;

                new PNotify({
                    title: "Sucesso",
                    text: "Configuração salva. Lembre de recarregar a tela principal.",
                    type: 'success',
                    icon: false,
                    addclass: "stack-bottomright"
                });
            });

            $('#syncsPasswd').val(null);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
            });
            $('#syncsPasswd').val(null);
        }
    });

    $('#btnClose').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let win = remote.getCurrentWindow();
        win.close();
    });

});

function sqlConnectGroups() {
    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query('select codigo, nome from grupo')
    }).then(result => {
        let Options = '';
        if (result.recordset.length) {
            _.forEach(result.recordset, function (group) {
                Options = Options + "<option value='" + group.codigo + "'>" + group.nome + "</option>";
            });
            $('#selectGroups').append(Options);
            $("#selectGroups").material_select();
        } else {
            Options = Options + "<option value='0' disable selected>Não há Grupos</option>";
            $('#selectGroups').append(Options);
            $("#selectGroups").material_select();
        }
    }).catch(err => {
        console.log(err);
        new PNotify({
            title: "Erro",
            text: err,
            type: 'error',
            icon: false,
            addclass: "stack-bottomright",
            delay: 6000
        });
        sqlDb.close();
    });
};

function sqlConnectCategories() {
    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query('select codigo, sigla, nome from categoria')
    }).then(result => {
        let Options = '';
        if (result.recordset.length) {
            _.forEach(result.recordset, function (cat) {
                Options = Options + "<option value='" + cat.codigo + "' data-abbvr='" + cat.sigla + "'>" + cat.nome + "</option>";
            });
            $('#selectCategories').append(Options);
            $("#selectCategories").material_select();
        } else {
            Options = Options + "<option value='0' disable selected>Não há Categorias</option>";
            $('#selectCategories').append(Options);
            $("#selectCategories").material_select();
        }
    }).catch(err => {
        console.log(err);
        new PNotify({
            title: "Erro",
            text: err,
            type: 'error',
            icon: false,
            addclass: "stack-bottomright",
            delay: 6000
        });
        sqlDb.close();
    });
};