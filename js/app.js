const {
    ipcRenderer,
    remote
} = eRequire('electron');
const os = eRequire('os');
const fse = eRequire('fs-extra');
const _ = eRequire("lodash");
const moment = eRequire('moment');
const sqlDb = eRequire("mssql");
const notifier = eRequire('node-notifier');
const path = eRequire('path');
// const uuid = require('uuid');
const io = eRequire('socket.io-client');
const timing = eRequire('timelite');
const storage = eRequire('electron-json-storage');

let destPath = 'c:\\softer\\Sincronizador';

const mainWin = remote.getCurrentWindow();

let peopleTableList = '',
    peopleTables = '',
    productsTableList = '',
    productsTables = '',
    itemsTableList = '',
    itemsTables = '',
    done = false,
    dbOrigin = {},
    dbDest = {},
    allowNoti = null,
    broadServer = null,
    syncStock = false,
    syncActive = false,
    syncNewItems = false,
    syncNewProducts = false,
    syncNewPeople = false,
    syncComission = false,
    syncCost = false,
    syncPrice = false,
    syncCategory,
    syncGroup,
    canSync,
    canRep,
    timer,
    startingTime;

fse.mkdirsSync(destPath);
fse.mkdirsSync(destPath + '\\config');
fse.mkdirsSync(destPath + '\\tabelas');

fse.readFile(`${destPath}\\config\\config.json`, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let fileRead = fse.readFileSync(`${destPath}\\config\\config.json`, 'utf8');
    let config = JSON.parse(fileRead);

    syncStock = config.syncStock || false;
    syncActive = config.syncActive || false;
    syncNewItems = config.syncNewItems || false;
    syncNewProducts = config.syncNewProducts || false;
    syncNewPeople = config.syncNewPeople || false;
    syncComission = config.syncComission || false;
    syncCost = config.syncCost || false;
    syncPrice = config.syncPrice || false;
    canSync = config.canSync || false;
    canRep = config.canRep || false;
    syncCategory = config.syncCategory;
    syncGroup = config.syncGroup;
    allowNoti = config.allowNoti || false;
    broadServer = config.broadServer || '';
});

fse.readFile(`${destPath}\\config\\dbOrigin.json`, function (err, data) {
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
    let fileRead = fse.readFileSync(`${destPath}\\config\\dbOrigin.json`, 'utf8');
    dbOrigin = JSON.parse(fileRead);
});

fse.readFile(`${destPath}\\config\\dbDest.json`, function (err, data) {
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
    let fileRead = fse.readFileSync(`${destPath}\\config\\dbDest.json`, 'utf8');
    dbDest = JSON.parse(fileRead);
});

const peopleFile = `${destPath}\\config\\people_table.txt`,
    productsFile = `${destPath}\\config\\products_table.txt`,
    itemsFile = `${destPath}\\config\\items_table.txt`;

fse.readFile(peopleFile, function (err, data) {
    if (err) {
        fse.writeFileSync(peopleFile, 'bairro,cadpais,cep,cidade,estado,financeira,fisica,logradouro,obscliente,pessoas,pessoatipocobranca,profissoes,regioes,telefone,tipologradouro,tipopessoa,tipotelefone', 'utf-8');
        return console.log(err);
    }
    peopleTableList = fse.readFileSync(peopleFile, 'utf8');
    peopleTables = peopleTableList.replace(/,\s*$/, "").split(',');
});

fse.readFile(productsFile, function (err, data) {
    if (err) {
        fse.writeFileSync(productsFile, 'categoria,colecao,custoproduto,grades,grupo,gruposubgrupo,itens_grade,itens_grade_estoque,parametros_produto,produto,produtofornecedor,subgrupo', 'utf-8');
        return console.log(err);
    }
    productsTableList = fse.readFileSync(productsFile, 'utf8');
    productsTables = productsTableList.replace(/,\s*$/, "").split(',');
});

fse.readFile(itemsFile, function (err, data) {
    if (err) {
        fse.writeFileSync(itemsFile, 'entrada,entradaitens', 'utf-8');
        return console.log(err);
    }
    itemsTableList = fse.readFileSync(itemsFile, 'utf8');
    itemsTables = itemsTableList.replace(/,\s*$/, "").split(',');
});

fse.remove(destPath + '\\tabelas\\', err => {
    if (err) return console.error(err)

    console.log('deleted all table files!') // I just deleted my entire HOME directory.
});

var stack_topleft = {
    "dir1": "down",
    "dir2": "right",
    "push": "top"
};

$(function () {

    $('.tooltipped').tooltip();

    $('#productsPasswordModal, #peoplePasswordModal, #itemsPasswordModal, #tablesPasswordModal, #logModal').modal();

    // console.log(destPath);
    storage.setDataPath(destPath);

    storage.remove(destPath + '\\tabelas', function (error) {
        if (error) throw error;
    });

    // Backup click
    $('#btnStartNotification').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        startSyncComunication();
    });

    // Backup click
    $('#btnBackup').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        NProgress.configure({
            minimum: 0.1,
            speed: 1000,
            trickleSpeed: 1000,
            parent: '#barProgress'
        }).start();

        $('#logModal').modal('open');
        $('#logModal .modal-content h5').html('Backup!');
        $('#btnOpenLog').removeClass('hide');

        let bkupChron = new Date();

        $("#ulTiming").empty();
        $('#ulTiming').append(`<li>Fazendo backup do banco de dados de destino as ${bkupChron.toLocaleTimeString()}.</li>`);

        let bkupQuery = "backup database " + dbDest.database + " to disk = 'c:\\softer\\sgi\\copia\\" + dbDest.database + "_" + moment(new Date()).format('DD-MM-YYYY_HH-mm-ss') + ".bak' with format, medianame = '" + dbDest.database + "', name = 'full backup of " + dbDest.database + "';";
        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
            return pool.request().query(bkupQuery)
        }).then(result => {
            NProgress.done();
            sqlDb.close();
            $('#ulTiming').append(`<li>Backup do banco de dados realizada com sucesso em ${n(dateDiff(bkupChron.getTime()).minute)}:${n(dateDiff(bkupChron.getTime()).second)}.</li>`);

            if (canSync) {
                if (syncNewItems)
                    $('#btnSyncItems').removeClass('disabled');
                if (syncNewProducts)
                    $('#btnSyncProducts').removeClass('disabled');
                if (syncNewPeople)
                    $('#btnSyncPeople').removeClass('disabled');

                if ((syncNewItems) || (syncNewPeople) || (syncNewProducts)) {
                    $('#btnStartSync').removeClass('disabled');
                }
            }

            if (canRep) {
                if (syncNewItems)
                    $('#btnOpenItemsModal').removeClass('disabled');
                if (syncNewProducts)
                    $('#btnOpenProductsModal').removeClass('disabled');
                if (syncNewPeople)
                    $('#btnOpenPeopleModal').removeClass('disabled');

                if ((syncNewItems) || (syncNewPeople) || (syncNewProducts)) {
                    $('#btnOpenTablesModal').removeClass('disabled');
                }
            }

            new PNotify({
                title: "Sucesso!",
                text: "Banco de dados copiado.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright"
            });

            // // Do this from the renderer process
            // var notif = new window.Notification('Sincronizador', {
            //     body: 'Backup concluido com sucesso.',
            //     silent: false // We'll play our own sound
            // });

            // // If the user clicks in the Notifications Center, show the app
            // notif.onclick = function () {
            //     ipcRenderer.send('focusWindow', 'main');
            // };

            notifier.notify({
                    title: 'Sincronizador',
                    message: 'Backup concluido com sucesso.',
                    sound: true, // true | false.
                    wait: true, // Wait for User Action against Notification
                    icon: path.join(__dirname, 'img/icon.png'),
                    // timeout: 10
                },
                function (err, response) {
                    // Response is response from notification
                    console.log(response);
                }
            );

            notifier.on('click', function (notifierObject, options) {
                mainWin.focus();
            });

            // notifier.notify({
            //         title: 'Sincronizador',
            //         message: 'Backup concluido com sucesso.',
            //         icon: 'https://cdn1.iconfinder.com/data/icons/google_jfk_icons_by_carlosjj/64/sync.png',
            //         contentImage: 'https://cdn1.iconfinder.com/data/icons/google_jfk_icons_by_carlosjj/64/sync.png',
            //     },
            //     function (error, response, metadata) {
            //         console.log(response, metadata);
            //     }
            // );
        }).catch(err => {
            console.log(err);
            new PNotify({
                title: "Erro",
                text: err,
                type: 'error',
                icon: false,
                addclass: "stack-bottomright"
            });
            sqlDb.close();
        });
    });

    // Backup click
    $('#btnEndNotification').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        endSyncComunication();
    });

    // Sync people click
    $('#btnSyncPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        $('#logModal .modal-content h5').html('Sincronizando Pessoas!');
        $('#logModal').modal('open');
        $('#btnOpenLog').removeClass('hide');
        $('#btnStartSync').addClass('disabled');

        $("#ulTiming").empty();
        $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

        NProgress.configure({
            minimum: 0.1,
            speed: 2000,
            trickleSpeed: 2000,
            parent: '#barProgress'
        }).start();

        timer = setInterval(function () {
            if (NProgress.status !== null) {
                mainWin.setProgressBar(NProgress.status);
            } else {
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                clearInterval(timer);
            }
        }, 100);

        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
            return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
        }).then(result => {
            sqlDb.close();
            getPeopleSync($btn);
        }).catch(err => {
            sqlError(err);
            $('#btnStartSync').removeClass('disabled');
        });
    });

    // Sync products click
    $('#btnSyncProducts').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        $('#logModal .modal-content h5').html('Sincronizando Produtos!');
        $('#logModal').modal('open');
        $('#btnOpenLog').removeClass('hide');
        $('#btnStartSync').addClass('disabled');

        $("#ulTiming").empty();
        $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

        NProgress.configure({
            minimum: 0.1,
            speed: 2000,
            trickleSpeed: 2000,
            parent: '#barProgress'
        }).start();

        timer = setInterval(function () {
            if (NProgress.status !== null) {
                mainWin.setProgressBar(NProgress.status);
            } else {
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                clearInterval(timer);
            }
        }, 100);

        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
            return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
        }).then(result => {
            sqlDb.close();
            getProductsSync($btn);
        }).catch(err => {
            sqlError(err);
            $($btn).attr('disabled', false);
        });
    });

    // Sync items click
    $('#btnSyncItems').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        $('#logModal .modal-content h5').html('Sincronizando Entradas!');
        $('#logModal').modal('open');
        $('#btnOpenLog').removeClass('hide');
        $('#btnStartSync').addClass('disabled');

        $("#ulTiming").empty();
        $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

        NProgress.configure({
            minimum: 0.1,
            speed: 2000,
            trickleSpeed: 2000,
            parent: '#barProgress'
        }).start();

        timer = setInterval(function () {
            if (NProgress.status !== null) {
                mainWin.setProgressBar(NProgress.status);
            } else {
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                clearInterval(timer);
            }
        }, 100);

        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
            return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
        }).then(result => {
            sqlDb.close();
            getItemsSync($btn);
        }).catch(err => {
            sqlError(err);
            $($btn).attr('disabled', false);
        });
    });

    // Replicate people click
    $('#btnRepPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;

        if ($('#peoplePasswd').val() == 'sftk123') {

            $('#btnOpenPeopleModal').addClass('disabled');
            $('#btnOpenTablesModal').addClass('disabled');
            $('#tablesPasswordModal').modal('close');

            $('#logModal .modal-content h5').html('Replicando Pessoas!');
            $('#logModal').modal('open');
            $('#btnOpenLog').removeClass('hide');
            $('#peoplePasswordModal').modal('close');

            $("#ulTiming").empty();
            $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

            NProgress.configure({
                minimum: 0.1,
                speed: 2000,
                trickleSpeed: 2000,
                parent: '#barProgress'
            }).start();

            timer = setInterval(function () {
                if (NProgress.status !== null) {
                    mainWin.setProgressBar(NProgress.status);
                } else {
                    clearInterval(timer);
                }
            }, 100);

            // startingTime = new Date();

            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
            }).then(result => {
                sqlDb.close();
                getPeople($btn);
            }).catch(err => {
                sqlError(err);
                $('#btnOpenPeopleModal').removeClass('disabled');
                $('#btnOpenTablesModal').removeClass('disabled');
            });

        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright"
            });
            $('#peoplePasswd').val(null);
        }
    });

    // Replicate products click
    $('#btnRepProducts').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;

        if ($('#productsPasswd').val() == 'sftk123') {

            $('#btnOpenProductsModal').addClass('disabled');
            $('#btnOpenTablesModal').addClass('disabled');
            $('#productsPasswordModal').modal('close');

            $('#logModal .modal-content h5').html('Replicando Produtos!');
            $('#logModal').modal('open');
            $('#btnOpenLog').removeClass('hide');

            $("#ulTiming").empty();
            $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

            NProgress.configure({
                minimum: 0.1,
                speed: 2000,
                trickleSpeed: 2000,
                parent: '#barProgress'
            }).start();

            timer = setInterval(function () {
                if (NProgress.status !== null) {
                    mainWin.setProgressBar(NProgress.status);
                } else {
                    mainWin.setProgressBar(1.0);
                    mainWin.setProgressBar(0);
                    clearInterval(timer);
                }
            }, 100);

            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;")
            }).then(result => {
                sqlDb.close();
                getProducts($btn);
            }).catch(err => {
                sqlError(err);
                $('#btnOpenProductsModal').removeClass('disabled');
                $('#btnOpenTablesModal').removeClass('disabled');
            });

        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright"
            });
            $('#productsPasswd').val(null);
        }
    });

    // Replicate items click
    $('#btnRepItems').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;

        if ($('#itemsPasswd').val() == 'sftk123') {

            $('#btnOpenItemsModal').addClass('disabled');
            $('#btnOpenTablesModal').addClass('disabled');
            $('#itemsPasswordModal').modal('close');

            $('#logModal .modal-content h5').html('Replicando Entradas!');
            $('#logModal').modal('open');
            $('#btnOpenLog').removeClass('hide');

            $("#ulTiming").empty();
            $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

            NProgress.configure({
                minimum: 0.1,
                speed: 2000,
                trickleSpeed: 2000,
                parent: '#barProgress'
            }).start();

            timer = setInterval(function () {
                if (NProgress.status !== null) {
                    mainWin.setProgressBar(NProgress.status);
                } else {
                    mainWin.setProgressBar(1.0);
                    mainWin.setProgressBar(0);
                    clearInterval(timer);
                }
            }, 100);

            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
            }).then(result => {
                sqlDb.close();
                getItems($btn);
            }).catch(err => {
                sqlError(err);
                $('#btnOpenItemsModal').removeClass('disabled');
                $('#btnOpenTablesModal').removeClass('disabled');
            });

        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright"
            });
            $('#itemsPasswd').val(null);
        }
    });

    // Replicate tables click
    $('#btnStartRep').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;

        if ($('#tablesPasswd').val() == 'replicar') {

            $('#btnOpenTablesModal').addClass('disabled');
            $('#tablesPasswordModal').modal('close');

            $('#logModal .modal-content h5').html('Replicando!');
            $('#logModal').modal('open');
            $('#btnOpenLog').removeClass('hide');

            $("#ulTiming").empty();
            $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

            NProgress.configure({
                minimum: 0.1,
                speed: 3000,
                trickleSpeed: 3000,
                parent: '#barProgress'
            }).start();

            startingTime = new Date();

            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
            }).then(result => {
                sqlDb.close();
                if (syncNewPeople) {
                    getPeople($btn);
                } else if (syncNewProducts) {
                    getProducts($btn);
                } else if (syncNewItems) {
                    getItems($btn);
                }
            }).catch(err => {
                sqlError(err);
                $('#btnOpenTablesModal').removeClass('disabled');
            });

        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright"
            });
            $('#tablesPasswd').val(null);
        }
    });

    // Replicate tables click
    $('#btnStartSync').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        $('.tooltipped').tooltip('close');

        let $btn = this;
        $($btn).attr('disabled', true);

        $('#logModal .modal-content h5').html('Sincronizando!');
        $('#logModal').modal('open');
        $('#btnOpenLog').removeClass('hide');

        $("#ulTiming").empty();
        $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

        NProgress.configure({
            minimum: 0.1,
            speed: 3000,
            trickleSpeed: 3000,
            parent: '#barProgress'
        }).start();

        timer = setInterval(function () {
            if (NProgress.status !== null) {
                mainWin.setProgressBar(NProgress.status);
            } else {
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                clearInterval(timer);
            }
        }, 100);

        startingTime = new Date();

        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
            return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
        }).then(result => {
            sqlDb.close();
            if (syncNewPeople) {
                getPeopleSync($btn);
            } else if (syncNewProducts) {
                getProductsSync($btn);
            } else if (syncNewItems) {
                getItemsSync($btn);
            }
        }).catch(err => {
            sqlError(err);
            $($btn).attr('disabled', false);
        });
    });

    // $('.tooltipHelp').mouseover(function (ele) {
    //     let msg = $(ele.currentTarget).data().tooltip;

    //     if (permanotice) {
    //         permanotice.open();
    //         permanotice.update({
    //             text: msg
    //         });
    //     } else {
    //         permanotice = new PNotify({
    //             title: 'Info!',
    //             addclass: 'tooltip',
    //             text: msg,
    //             type: 'warning',
    //             icon: false,
    //             addclass: "stack-topright",
    //             stack: stack_topleft
    //         });
    //     }
    // });

    // $('.tooltipHelp').mouseout(function (ele) {
    //     if (permanotice) permanotice.remove();
    // });

    setTimeout(function () {
        if (allowNoti) {
            $('.noti').removeClass('hide');
        }

        const alertOnlineStatus = () => {
            if (!navigator.onLine) {
                $('#btnStartNotification, #btnEndNotification, #btnBackup').prop('disabled', true);

                window.alert('Sem internet');
            }
        }

        // window.addEventListener('online', alertOnlineStatus)
        // window.addEventListener('offline', alertOnlineStatus)

        alertOnlineStatus()
    }, 200);
});

function getPeople(btn) {
    let $btn = btn,
        start = new Date(),
        starting = new Date(),
        sqlGet = '';

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados de pessoas as ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            starting = new Date();

            let counter = peopleTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(peopleTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`Adquirido ${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column, i) {
                            columns += column.name + ',';
                        });
                        columns = `${columns.replace(/,\s*$/, "")}`;

                        storage.set(item + '_columns', columns, function (error) {
                            if (error)
                                throw error;

                            starting = new Date();
                            counter = counter - 1;
                            if (counter == 0) {
                                $('#ulTiming').append(`<li>Dados de pessoas adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importPeople($btn);
                            }
                        });
                    });
                } else {
                    counter = counter - 1;

                    if (counter == 0) {
                        $('#ulTiming').append(`<li>Tabela ${item} vazia.</li>`);
                        done = true;
                        NProgress.done();
                        sqlDb.close();
                        clearInterval(myVal);
                        clearInterval(timer);
                        mainWin.setProgressBar(1.0);
                        mainWin.setProgressBar(0);
                    }
                }
            });

        }).catch(err => {
            sqlError(err);
        });
    }).catch(err => {
        sqlError(err);
    });
};

function importPeople(btn) {
    let $btn = btn,
        counter = peopleTables.length,
        start = new Date(),
        starting = new Date(),

        myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 5:
                            $('#ulTiming').append(`<li>Finanlizando replicaçao de milhares de dados. Aguarde...</li>`);
                            break;
                        case 2:
                            $('#ulTiming').append(`<li>Replicando milhares de dados. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#ulTiming').append(`<li>Replicação ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Replicação de dados em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000);

    $('#ulTiming').append(`<li>Replicando <span id="liPeople">${peopleTables.length}</span> de ${peopleTables.length} tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                let theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                sqlInst += `delete from ${table}; `;
                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                sqlInst += `set identity_insert ${table} on; `;
                sqlInst += `declare @list_${table + '_' + index} varchar(max); `;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {

                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
                        sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                    });

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {
                        console.log(`Replicado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liPeople').html(counter);

                        if (counter == 0) {

                            done = true;

                            let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                            $('#ulTiming').append(`<li>Dados de pessoas replicados em ${totalTiming}.</li>`);

                            if ($btn.id == 'btnStartRep') {
                                if (syncNewProducts) {
                                    getProducts($btn);
                                } else if (syncNewItems) {
                                    getItems($btn);
                                } else {
                                    endPeopleRep();
                                }
                            } else {
                                endPeopleRep();
                            }
                        }
                    }).catch(err => {
                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                NProgress.done();
                            }).catch(err => {
                                sqlError(err);
                            });
                        }).catch(err => {
                            sqlError(err);
                        });

                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $($btn).attr('disabled', false);
                        $('#btnOpenPeopleModal').removeClass('disabled');
                    });
                }).catch(err => {
                    sqlError(err);
                    clearInterval(myVal);
                    clearInterval(timer);
                    $('#btnOpenPeopleModal').removeClass('disabled');
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });

    function endPeopleRep() {
        sqlDb.connect(dbDest).then(pool => {
            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
            pool.request().query(sqlEndInst).then(result => {
                // console.log(result);
                sqlDb.close();
                new PNotify({
                    title: "Sucesso",
                    text: "Replicação executada com sucesso.",
                    type: 'success',
                    icon: false,
                    addclass: "stack-bottomright"
                });
                NProgress.done();
                clearInterval(myVal);
                clearInterval(timer);
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                notifier.notify({
                    title: 'Sincronizador',
                    message: 'Dados replicados com sucesso.',
                    sound: true,
                    wait: true,
                    icon: path.join(__dirname, 'img/icon.png'),
                }, function (err, response) {
                    // Response is response from notification
                    console.log(response);
                });
                notifier.on('click', function (notifierObject, options) {
                    mainWin.focus();
                });
            }).catch(err => {
                sqlError(err);
                clearInterval(myVal);
                clearInterval(timer);
                $($btn).attr('disabled', false);
                $('#btnOpenPeopleModal').removeClass('disabled');
            });
        }).catch(err => {
            sqlError(err);
            clearInterval(myVal);
            clearInterval(timer);
            $($btn).attr('disabled', false);
            $('#btnOpenPeopleModal').removeClass('disabled');
        });
    }
};

function getProducts(btn) {
    let $btn = btn,
        start = new Date(),
        starting = new Date(),
        sqlGet = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (item, index) {
        switch (item) {
            case 'custoproduto':
                if (syncCost) {
                    sqlGet += `select * from sinc_${item}_view; `;
                } else {
                    productsTables = productsTables.filter(e => e !== 'custoproduto');
                }
                break;
            case 'produto':
                sqlGet += `select p.* from sinc_${item}_view p `;

                if (syncGroup) {
                    sqlGet += `left outer join grupo g on g.codigo = p.grupo`;
                }
                if (syncCategory) {
                    sqlGet += `left outer join categoria c on c.codigo = p.categoria`;
                }

                sqlGet += ' where 1 = 1 ';

                if (syncGroup) {
                    sqlGet += `and not isnull(g.nome, '') = '${syncGroup}' `;
                }
                if (syncCategory) {
                    sqlGet += `and not isnull(c.sigla, '') = '${syncCategory}' `;
                }

                sqlGet += `order by p.data_cadastro desc; `;
                break;
            default:
                sqlGet += `select * from sinc_${item}_view; `;
                break;
        };
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados de produtos as ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            starting = new Date();

            let counter = productsTables.length;
            _.forEach(productsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`Adquirido ${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column, i) {
                            columns += column.name + ',';
                        });
                        columns = `${columns.replace(/,\s*$/, "")}`;

                        storage.set(item + '_columns', columns, function (error) {
                            if (error)
                                throw error;

                            starting = new Date();
                            counter = counter - 1;
                            if (counter == 0) {
                                $('#ulTiming').append(`<li>Dados de produtos adiquirido em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importProducts($btn);
                            }
                        });
                    });
                } else {
                    counter = counter - 1;

                    if (counter == 0) {
                        $('#ulTiming').append(`<li>Tabela ${item} vazia.</li>`);
                        done = true;
                        NProgress.done();
                        sqlDb.close();
                        clearInterval(myVal);
                        clearInterval(timer);
                        mainWin.setProgressBar(1.0);
                        mainWin.setProgressBar(0);
                    }
                }
            });

        }).catch(err => {
            sqlError(err);
        });
    }).catch(err => {
        sqlError(err);
    });
};

function importProducts(btn) {
    let $btn = btn,
        counter = productsTables.length,
        start = new Date(),
        starting = new Date(),

        myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 2:
                            $('#ulTiming').append(`<li>Replicando milhares de produtos. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#ulTiming').append(`<li>Replicação ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Replicação de produtos em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000);

    $('#ulTiming').append(`<li>Replicando <span id="liProducts">${productsTables.length}</span> de ${productsTables.length} tabelas as ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (table, index) {

        let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

        sqlInst += `delete from ${table}; `;
        sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
        sqlInst += `set identity_insert ${table} on; `;

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (err) throw new Error;

            if (exists) {
                let theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                sqlInst += `declare @list_${table + '_' + index.toString()} varchar(max); `;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index.toString()} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {

                        sqlSel += `select `;
                        let sqlSelIn = '';
                        _.forEach(data, function (value) {
                            if (value == null) {
                                sqlSelIn += `${null}, `;
                            } else if (value instanceof Date) {
                                sqlSelIn += `''${moment(value).format('DD/MM/YYYY HH:mm')}'', `;
                            } else if (isNaN(value)) {
                                sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
                            } else if (value == true) {
                                sqlSelIn += `1, `;
                            } else if (value == false) {
                                sqlSelIn += `0, `;
                            } else {
                                if (value.length > 10) {
                                    sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
                                } else {
                                    sqlSelIn += `${value}, `;
                                }
                            }
                        });
                        sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                    });

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index.toString()}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {
                        console.log(`Replicado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liProducts').html(counter);

                        if (counter == 0) {

                            done = true;

                            let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                            $('#ulTiming').append(`<li>Dados de produtos replicados em ${totalTiming}.</li>`);

                            if ($btn.id == 'btnStartRep') {
                                if (syncNewItems) {
                                    getItems($btn);
                                } else {
                                    endProductsRep();
                                }
                            } else {
                                endProductsRep();
                            }
                        }
                    }).catch(err => {
                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            pool.request().query("exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;").then(result => {
                                // console.log(result);
                                $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                NProgress.done();
                                sqlDb.close();
                                $('#btnOpenProductsModal').removeClass('disabled');
                            }).catch(err => {
                                sqlError(err);
                            });
                        });

                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $('#btnOpenProductsModal').removeClass('disabled');
                    });
                }).catch(err => {
                    sqlError(err);
                    clearInterval(myVal);
                    clearInterval(timer);
                    $('#btnOpenProductsModal').removeClass('disabled');
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });

    function endProductsRep() {
        sqlDb.connect(dbDest).then(pool => {
            pool.request().query("exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;").then(result => {
                // console.log(result);
                sqlDb.close();
                new PNotify({
                    title: "Sucesso",
                    text: "Replicação executada com sucesso.",
                    type: 'success',
                    icon: false,
                    addclass: "stack-bottomright"
                });
                NProgress.done();
                clearInterval(myVal);
                clearInterval(timer);
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                notifier.notify({
                    title: 'Sincronizador',
                    message: 'Dados replicados com sucesso.',
                    sound: true,
                    wait: true,
                    icon: path.join(__dirname, 'img/icon.png'),
                }, function (err, response) {
                    // Response is response from notification
                    console.log(response);
                });
                notifier.on('click', function (notifierObject, options) {
                    mainWin.focus();
                });
            }).catch(err => {
                sqlError(err);
                clearInterval(myVal);
                clearInterval(timer);
                $('#btnOpenProductsModal').removeClass('disabled');
            });
        }).catch(err => {
            sqlError(err);
            clearInterval(myVal);
            clearInterval(timer);
            $('#btnOpenProductsModal').removeClass('disabled');
        });
    }
};

function getItems(btn) {
    let $btn = btn,
        start = new Date(),
        starting = new Date(),
        sqlGet = '';

    // Iterating thru the list of itemsTables
    _.forEach(itemsTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo entradas ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            starting = new Date();

            let counter = itemsTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(itemsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`Adquirido ${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column, i) {
                            columns += column.name + ',';
                        });
                        columns = `${columns.replace(/,\s*$/, "")}`;

                        storage.set(item + '_columns', columns, function (error) {
                            if (error)
                                throw error;

                            starting = new Date();
                            counter = counter - 1;
                            if (counter == 0) {
                                $('#ulTiming').append(`<li>Dados de entradas adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importItems($btn);
                            }
                        });
                    });
                } else {
                    counter = counter - 1;

                    if (counter == 0) {
                        $('#ulTiming').append(`<li>Tabela ${item} vazia.</li>`);
                        done = true;
                        NProgress.done();
                        sqlDb.close();
                        clearInterval(myVal);
                        clearInterval(timer);
                        mainWin.setProgressBar(1.0);
                        mainWin.setProgressBar(0);
                    }
                }
            });

        }).catch(err => {
            sqlError(err);
        });
    }).catch(function (err) {
        sqlError(err);
    });
};

function importItems(btn) {
    let $btn = btn,
        counter = itemsTables.length,
        start = new Date(),
        starting = new Date(),

        myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 5:
                            $('#ulTiming').append(`<li>Finalizando replicação milhares de dados de produtos. Aguarde...</li>`);
                            break;
                        case 2:
                            $('#ulTiming').append(`<li>Replicando milhares de items. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#ulTiming').append(`<li>Replicação ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Replicação de items em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000);

    $('#ulTiming').append(`<li>Replicando <span id="liItems">${itemsTables.length}</span> de ${itemsTables.length} tabelas as ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of itemsTables
    _.forEach(itemsTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                let theColumns;
                theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                sqlInst += `delete from ${table}; `;
                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                sqlInst += `set identity_insert ${table} on; `;
                sqlInst += `declare @list_${table + '_' + index} varchar(max); `;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {
                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
                        sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                    });

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {
                        console.log(`Replicado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liItems').html(counter);

                        if (counter == 0) {

                            done = true;

                            let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                            $('#ulTiming').append(`<li>Dados de entrada replicados em ${totalTiming}.</li>`);

                            sqlDb.connect(dbDest).then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    sqlDb.close();

                                    if ($btn.id == 'btnStartRep') {
                                        let totalTiming = moment.utc(moment(new Date()).diff(moment(startingTime))).format('mm:ss');
                                        $('#ulTiming').append(`<li>Tempo total: ${totalTiming}.</li>`);
                                    }

                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Replicação executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });

                                    NProgress.done();
                                    clearInterval(myVal);
                                    clearInterval(timer);
                                    mainWin.setProgressBar(1.0);
                                    mainWin.setProgressBar(0);

                                    notifier.notify({
                                            title: 'Sincronizador',
                                            message: 'Dados replicados com sucesso.',
                                            sound: true, // true | false.
                                            wait: true, // Wait for User Action against Notification
                                            icon: path.join(__dirname, 'img/icon.png'),
                                            // timeout: 10
                                        },
                                        function (err, response) {
                                            // Response is response from notification
                                            console.log(response);
                                        });

                                    notifier.on('click', function (notifierObject, options) {
                                        mainWin.focus();
                                    });
                                }).catch(err => {
                                    sqlError(err);
                                    clearInterval(myVal);
                                    clearInterval(timer);
                                    $('#btnOpenItemsModal').removeClass('disabled');
                                });
                            }).catch(err => {
                                sqlError(err);
                                clearInterval(myVal);
                                clearInterval(timer);
                                $('#btnOpenItemsModal').removeClass('disabled');
                            });
                        }
                    }).catch(err => {

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                // console.log(result);
                                $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                NProgress.done();
                            }).catch(err => {
                                sqlError(err);
                            });
                        }).catch(err => {
                            sqlError(err);
                        });

                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $($btn).attr('disabled', false);
                        $('#btnOpenItemsModal').removeClass('disabled');
                    });
                }).catch(function (err) {
                    sqlError(err);
                    clearInterval(myVal);
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

function getPeopleSync(btn) {
    let $btn = btn,
        start = new Date(),
        starting = new Date(),
        sqlGet = '';

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados de pessoas as ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            starting = new Date();

            let counter = peopleTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(peopleTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`Adquirido ${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column, i) {
                            columns += column.name + ',';
                        });
                        columns = `${columns.replace(/,\s*$/, "")}`;

                        storage.set(item + '_columns', columns, function (error) {
                            if (error)
                                throw error;

                            starting = new Date();
                            counter = counter - 1;
                            if (counter == 0) {
                                $('#ulTiming').append(`<li>Dados de pessoas adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importPeopleSync($btn);
                            }
                        });
                    });
                } else {
                    counter = counter - 1;

                    if (counter == 0) {
                        $('#ulTiming').append(`<li>Tabela ${item} vazia.</li>`);
                        done = true;
                        NProgress.done();
                        sqlDb.close();
                        clearInterval(myVal);
                        clearInterval(timer);
                        mainWin.setProgressBar(1.0);
                        mainWin.setProgressBar(0);
                    }
                }
            });
        }).catch(err => {
            sqlError(err);
        });
    }).catch(function (err) {
        sqlError(err);
    });
};

function importPeopleSync(btn) {
    let $btn = btn,
        counter = peopleTables.length,
        start = new Date(),
        starting = new Date(),

        myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 5:
                            $('#ulTiming').append(`<li>Finalizando sincronização de milhares de dados. Aguarde...</li>`);
                            break;
                        case 2:
                            $('#ulTiming').append(`<li>Sincronizando milhares de dados. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#ulTiming').append(`<li>Sincronização ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Sincronização de dados em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000);

    $('#ulTiming').append(`<li>Sincronizando <span id="liPeople">${peopleTables.length}</span> de ${peopleTables.length} tabelas as ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                let theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                sqlInst += `delete from ${table}; `;
                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                sqlInst += `set identity_insert ${table} on; `;
                sqlInst += `declare @list_${table + '_' + index} varchar(max); `;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {
                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
                        sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                    });

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {
                        console.log(`Sincronizado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liPeople').html(counter);

                        if (counter == 0) {

                            done = true;

                            let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                            $('#ulTiming').append(`<li>Dados de pessoas sincronizados em ${totalTiming}.</li>`);

                            if ($btn.id == 'btnStartSync') {
                                if (syncNewProducts) {
                                    getProductsSync($btn);
                                } else if (syncNewItems) {
                                    getItemsSync($btn);
                                } else {
                                    endPeopleSync();
                                }
                            } else {
                                endPeopleSync();
                            }
                        }
                    }).catch(err => {
                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                // console.log(result);
                                $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                NProgress.done();
                            }).catch(err => {
                                sqlError(err);
                            });
                        }).catch(err => {
                            sqlError(err);
                        });

                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $($btn).attr('disabled', false);
                    });
                }).catch(function (err) {
                    sqlError(err);
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });

    function endPeopleSync() {
        sqlDb.connect(dbDest).then(pool => {
            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
            pool.request().query(sqlEndInst).then(result => {
                // console.log(result);
                sqlDb.close();
                new PNotify({
                    title: "Sucesso",
                    text: "Sincronização executada com sucesso.",
                    type: 'success',
                    icon: false,
                    addclass: "stack-bottomright"
                });
                NProgress.done();
                clearInterval(myVal);
                clearInterval(timer);
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
                notifier.notify({
                    title: 'Sincronizador',
                    message: 'Dados sincronizados com sucesso.',
                    sound: true,
                    wait: true,
                    icon: path.join(__dirname, 'img/icon.png'),
                }, function (err, response) {
                    // Response is response from notification
                    console.log(response);
                });
                notifier.on('click', function (notifierObject, options) {
                    mainWin.focus();
                });
            }).catch(err => {
                sqlError(err);
                clearInterval(myVal);
                clearInterval(timer);
                $($btn).attr('disabled', false);
            });
        }).catch(err => {
            sqlError(err);
            clearInterval(myVal);
            clearInterval(timer);
            $($btn).attr('disabled', false);
        });
    }
};

function getProductsSync(btn) {
    let $btn = btn,
        start = new Date(),
        starting = new Date(),
        sqlGet = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (item, index) {
        switch (item) {
            case 'custoproduto':
                if (syncCost) {
                    sqlGet += `select * from sinc_${item}_view; `;
                } else {
                    productsTables = productsTables.filter(e => e !== 'custoproduto');
                }
                break;
            case 'produto':
                sqlGet += `select p.* from sinc_${item}_view p `;

                if (syncGroup) {
                    sqlGet += `left outer join grupo g on g.codigo = p.grupo`;
                }
                if (syncCategory) {
                    sqlGet += `left outer join categoria c on c.codigo = p.categoria`;
                }

                sqlGet += ' where isnull(p.sinc, 0) = 0 ';

                if (syncGroup) {
                    sqlGet += `and not isnull(g.nome, '') = '${syncGroup}' `;
                }
                if (syncCategory) {
                    sqlGet += `and not isnull(c.sigla, '') = '${syncCategory}' `;
                }

                sqlGet += `order by p.data_cadastro desc; `;
                break;
            default:
                sqlGet += `select * from sinc_${item}_view; `;
                break;
        };
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados de produtos as ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {

            starting = new Date();

            let counter = productsTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(productsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`Adquirido ${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column, i) {
                            columns += column.name + ',';
                        });
                        columns = `${columns.replace(/,\s*$/, "")}`;

                        storage.set(item + '_columns', columns, function (error) {
                            if (error)
                                throw error;

                            starting = new Date();
                            counter = counter - 1;
                            if (counter == 0) {
                                $('#ulTiming').append(`<li>Dados de produtos adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importProductsSync($btn);
                            }
                        });
                    });
                } else {
                    counter = counter - 1;

                    if (counter == 0) {
                        $('#ulTiming').append(`<li>Tabela ${item} vazia.</li>`);
                        done = true;
                        NProgress.done();
                        sqlDb.close();
                        clearInterval(myVal);
                        clearInterval(timer);
                        mainWin.setProgressBar(1.0);
                        mainWin.setProgressBar(0);
                    }
                }
            });

        }).catch(err => {
            sqlError(err);
            $($btn).attr('disabled', false);
        });
    }).catch(function (err) {
        sqlError(err);
    });
};

function importProductsSync(btn) {
    let $btn = btn,
        counter = productsTables.length,
        start = new Date(),
        starting = new Date(),
        sqlInst = '',

        myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                if (dateDiff(starting.getTime()).minute >= 2) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 6:
                            $('#ulTiming').append(`<li>Finalizando sincronização de milhares de produtos. Aguarde...</li>`);
                            break;
                        case 5:
                            $('#ulTiming').append(`<li>Sincronizando milhares de produtos. Aguarde...</li>`);
                            break;
                        case 4:
                            $('#ulTiming').append(`<li>Sincronização ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Sincronização de produtos em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000);

    $('#ulTiming').append(`<li>Sincronizando <span id="liProducts">${productsTables.length}</span> de ${productsTables.length} tabelas as ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                if (table == 'produto') {

                    let theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                    let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                    let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                    sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                    // sqlInst += `alter table ${table} nocheck constraint all; `

                    sqlInst += `select top 0 * into #sinc_${table}_${index} from ${table}; `;

                    if (table == 'Itens_Grade_Estoque')
                        sqlInst += `delete from ${table}; `;

                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += `set identity_insert #sinc_${table}_${index} on; `;

                    sqlInst += `declare @list_${table}_${index} varchar(max); `;

                    _.forEach(jsonData, function (parts) {

                        sqlInst += `set @list_${table}_${index} = `;

                        let sqlSel = `'`;
                        _.forEach(parts, function (data) {

                            sqlSel += `select `;
                            let sqlSelIn = '';
                            _.forEach(data, function (value) {
                                if (value == null) {
                                    sqlSelIn += `${null}, `;
                                } else if (value instanceof Date) {
                                    sqlSelIn += `''${moment(value).format('DD/MM/YYYY HH:mm')}'', `;
                                } else if (isNaN(value)) {
                                    if (value instanceof Array) {
                                        if (isNaN(value[0])) {
                                            sqlSelIn += `''${value[0]}'', `;
                                        } else {
                                            sqlSelIn += `${value[0]}, `;
                                        }
                                    } else {
                                        sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
                                    }
                                } else if (value == true) {
                                    if (value == 1) {
                                        sqlSelIn += `1, `;
                                    } else {
                                        if (isNaN(value)) {
                                            sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
                                        } else {
                                            sqlSelIn += `${value.replace(/["']/g, "")}, `;
                                        }
                                    }
                                } else if (value == false) {
                                    if (value.length == 1) {
                                        sqlSelIn += `0, `;
                                    } else {
                                        sqlSelIn += `''${value.toString()}'', `;
                                    }
                                } else {
                                    if (value.length > 10) {
                                        sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
                                    } else {
                                        sqlSelIn += `${value.toString()}, `;
                                    }
                                }
                            });
                            sqlSel += sqlSelIn.replace(/,\s*$/, " ");

                        });

                        sqlInst += `${sqlSel}' insert into #sinc_${table}_${index} (`;

                        sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table}_${index}); `;
                    });

                    sqlInst += `update t_${index}_1 set `;

                    let columnParts = theColumns.replace(/['"]+/g, '').split(',');

                    let columnParts1 = _.pull(columnParts, 'codigo');

                    if (!syncPrice) {
                        columnParts1 = _.pull(columnParts1, 'preco', 'lucro');
                        if (!syncCost) {
                            columnParts1 = _.pull(columnParts1, 'lucro', 'markup', 'preco_venda');
                        }
                    }

                    if (!syncStock) {
                        columnParts1 = _.pull(columnParts1, 'estoque');
                    }

                    if (!syncComission) {
                        columnParts1 = _.pull(columnParts1, 'comissao');
                    }

                    if (!syncActive) {
                        columnParts1 = _.pull(columnParts1, 'ativo', 'ativo_pdv');
                    }

                    sqlSel = '';
                    let sqlUpdate = '';
                    _.forEach(columnParts1, function (prop) {
                        sqlUpdate += `t_${index}_1.${prop} = t_${index}_2.${prop}, `;
                    });

                    sqlSel = sqlUpdate.replace(/,\s*$/, " ");

                    sqlInst += sqlSel + ' ';
                    sqlInst += `from ${table} as t_${index}_1 `;

                    if (table == 'parametros_produto') {
                        sqlInst += `inner join #sinc_${table}_${index} as t_${index}_2 on t_${index}_1.codproduto = t_${index}_2.codproduto; `;
                    } else if (table !== 'Itens_Grade_Estoque') {
                        sqlInst += `inner join #sinc_${table}_${index} as t_${index}_2 on t_${index}_1.codigo = t_${index}_2.codigo; `;
                    }

                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += 'begin ';
                    sqlInst += `set identity_insert #sinc_${table}_${index} off; `;
                    sqlInst += `set identity_insert ${table} on; `;
                    sqlInst += 'end ;';

                    let columnParts2 = theColumns.replace(/['"]+/g, '').split(',');

                    if (!syncPrice) {
                        columnParts2 = _.pull(columnParts2, 'preco', 'lucro');
                        if (!syncCost) {
                            columnParts2 = _.pull(columnParts2, 'lucro', 'markup', 'preco_venda');
                        }
                    }

                    if (!syncStock) {
                        columnParts2 = _.pull(columnParts2, 'estoque');
                    }

                    if (!syncComission) {
                        columnParts2 = _.pull(columnParts2, 'comissao');
                    }

                    if (!syncActive) {
                        columnParts2 = _.pull(columnParts2, 'ativo', 'ativo_pdv');
                    }

                    sqlInst += `insert into ${table} ( `;

                    sqlSel = '';
                    sqlUpdate = '';
                    _.forEach(columnParts2, function (prop) {
                        sqlUpdate += `${prop}, `;
                    });

                    sqlSel = sqlUpdate.replace(/,\s*$/, " ");
                    sqlInst += sqlSel + ') ';

                    sqlSel = '';
                    sqlUpdate = 'select ';
                    _.forEach(columnParts2, function (prop) {
                        sqlUpdate += `#sinc_${table}_${index}.${prop}, `;
                    });

                    sqlSel = sqlUpdate.replace(/,\s*$/, " ");
                    sqlInst += sqlSel + ' ';

                    sqlInst += `from #sinc_${table}_${index} `;
                    // sqlInst += `left outer join ${table} on ${table}.codigo = #sinc_${table}_${index}.codigo `;

                    if (table == 'parametros_produto') {
                        sqlInst += `where not #sinc_${table}_${index}.codproduto in (select codproduto from ${table}); `;
                    } else if (table !== 'Itens_Grade_Estoque') {
                        sqlInst += `where not #sinc_${table}_${index}.codigo in (select codigo from ${table}); `;
                    }

                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += 'begin ';
                    sqlInst += `set identity_insert #sinc_${table}_${index} off; `;
                    sqlInst += `drop table #sinc_${table}_${index}; `;
                    sqlInst += `set identity_insert ${table} off; `;
                    sqlInst += 'end; ';

                    // sqlInst += "waitfor delay \'00:00:05\';";

                    // console.log(sqlInst);

                    // adding to sql database
                    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                        pool.request().query(sqlInst).then(result => {
                            console.log(`Sincronizado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                            starting = new Date();

                            counter = counter - 1;

                            $('#liProducts').html(counter);

                            if (counter == 0) {

                                done = true;

                                let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                                $('#ulTiming').append(`<li>Dados de produtos sincronizados em ${totalTiming}.</li>`);

                                if ($btn.id == 'btnStartSync') {
                                    sqlDb.connect(dbOrigin).then(pool => {
                                        pool.request().query('update produto set sinc = 1;').then(result => {
                                            // console.log(result);
                                            sqlDb.close();
                                            if (syncNewItems) {
                                                getItemsSync($btn);
                                            } else {
                                                endProductsSync();
                                            }
                                        }).catch(err => {
                                            sqlError(err);
                                            $($btn).attr('disabled', false);
                                        });
                                    });
                                } else {
                                    endProductsSync();
                                }
                            }
                        }).catch(err => {
                            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                    sqlDb.close();
                                    new PNotify({
                                        title: "Erro",
                                        text: result,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    NProgress.done();
                                    clearInterval(myVal);
                                    clearInterval(timer);
                                    mainWin.setProgressBar(1.0);
                                    mainWin.setProgressBar(0);
                                }).catch(err => {
                                    sqlError(err);
                                });
                            }).catch(err => {
                                sqlError(err);
                            });

                            sqlError(err);
                            clearInterval(myVal);
                            clearInterval(timer);
                            $($btn).attr('disabled', false);
                        });
                    }).catch(function (err) {
                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $($btn).attr('disabled', false);
                    });
                } else {
                    let theColumns;
                    theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                    let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                    let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                    let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                    sqlInst += `delete from ${table}; `;
                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += `set identity_insert ${table} on; `;
                    sqlInst += `declare @list_${table + '_' + index} varchar(max); `;

                    _.forEach(jsonData, function (parts) {

                        sqlInst += `set @list_${table + '_' + index} = `;

                        let sqlSel = `'`;
                        _.forEach(parts, function (data) {

                            sqlSel += `select `;
                            let sqlSelIn = '';
                            sqlSelIn = formatValue1(data, sqlSelIn);
                            sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                        });

                        sqlInst += `${sqlSel}'; insert into ${table} (`;

                        sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index}); `;
                    });

                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                    sqlInst += `set identity_insert ${table} off; `;

                    // adding to sql database
                    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                        pool.request().query(sqlInst).then(result => {
                            console.log(`Sincronizado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                            starting = new Date();

                            counter = counter - 1;

                            $('#liProducts').html(counter);

                            if (counter == 0) {

                                done = true;

                                let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                                $('#ulTiming').append(`<li>Dados de produtos sincronizados em ${totalTiming}.</li>`);

                                if ($btn.id == 'btnStartSync') {
                                    sqlDb.connect(dbOrigin).then(pool => {
                                        pool.request().query('update produto set sinc = 1;').then(result => {
                                            // console.log(result);
                                            sqlDb.close();
                                            if (syncNewItems) {
                                                getItemsSync($btn);
                                            } else {
                                                endProductsSync();
                                                let totalTiming = moment.utc(moment(new Date()).diff(moment(startingTime))).format('mm:ss');
                                                $('#ulTiming').append(`<li>Tempo total: ${totalTiming}.</li>`);
                                            }
                                        }).catch(err => {
                                            sqlError(err);
                                            $($btn).attr('disabled', false);
                                        });
                                    });
                                } else {
                                    endProductsSync();
                                }
                            }
                        }).catch(err => {

                            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                    sqlDb.close();
                                    new PNotify({
                                        title: "Erro",
                                        text: result,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    NProgress.done();
                                }).catch(err => {
                                    sqlError(err);
                                });
                            }).catch(err => {
                                sqlError(err);
                            });

                            sqlError(err);
                            clearInterval(myVal);
                            clearInterval(timer);
                            $($btn).attr('disabled', false);
                        });
                    }).catch(function (err) {
                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $($btn).attr('disabled', false);
                    });
                }
            } else {
                counter = counter - 1;
            }
        });
    });

    function endProductsSync() {
        sqlDb.connect(dbDest).then(pool => {
            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
            pool.request().query(sqlEndInst).then(result => {
                // console.log(result);
                sqlDb.close();
                sqlDb.connect(dbOrigin).then(pool => {
                    pool.request().query('update produto set sinc = 1;').then(result => {
                        // console.log(result);
                        sqlDb.close();
                        new PNotify({
                            title: "Sucesso",
                            text: "Sincronização executada com sucesso.",
                            type: 'success',
                            icon: false,
                            addclass: "stack-bottomright",
                            delay: 6000
                        });
                        notifier.notify({
                            title: 'Sincronizador',
                            message: 'Dados sincronizados com sucesso.',
                            sound: true,
                            wait: true,
                            icon: path.join(__dirname, 'img/icon.png'),
                        }, function (err, response) {
                            // Response is response from notification
                            console.log(response);
                        });
                        notifier.on('click', function (notifierObject, options) {
                            mainWin.focus();
                        });
                    }).catch(err => {
                        sqlError(err);
                        $($btn).attr('disabled', false);
                    });
                });
                NProgress.done();
                clearInterval(myVal);
                clearInterval(timer);
                mainWin.setProgressBar(1.0);
                mainWin.setProgressBar(0);
            }).catch(err => {
                sqlError(err);
                clearInterval(myVal);
                clearInterval(timer);
                $($btn).attr('disabled', false);
            });
        }).catch(err => {
            sqlError(err);
            clearInterval(myVal);
            clearInterval(timer);
            $($btn).attr('disabled', false);
        });
    }
};

function getItemsSync(btn) {
    let $btn = btn,
        start = new Date(),
        starting = new Date(),
        sqlGet = '';

    // Iterating thru the list of itemsTables
    _.forEach(itemsTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados de entradas as ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            starting = new Date();

            let counter = itemsTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(itemsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`Adquirido ${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column, i) {
                            columns += column.name + ',';
                        });
                        columns = `${columns.replace(/,\s*$/, "")}`;

                        storage.set(item + '_columns', columns, function (error) {
                            if (error)
                                throw error;

                            starting = new Date();
                            counter = counter - 1;
                            if (counter == 0) {
                                $('#ulTiming').append(`<li>Entradas adiquiridas em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importItemsSync($btn);
                            }
                        });
                    });
                } else {
                    counter = counter - 1;

                    if (counter == 0) {
                        $('#ulTiming').append(`<li>Tabela ${item} vazia.</li>`);
                        done = true;
                        NProgress.done();
                        sqlDb.close();
                        clearInterval(myVal);
                        clearInterval(timer);
                        mainWin.setProgressBar(1.0);
                        mainWin.setProgressBar(0);
                    }
                }
            });

        }).catch(err => {
            sqlError(err);
            $($btn).attr('disabled', false);
        });
    }).catch(function (err) {
        sqlError(err);
    });
};

function importItemsSync(btn) {
    let $btn = btn,
        counter = itemsTables.length,
        start = new Date(),
        starting = new Date(),

        myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 5:
                            $('#ulTiming').append(`<li>Finalizando sincronização de milhares de items. Aguarde...</li>`);
                            break;
                        case 2:
                            $('#ulTiming').append(`<li>Sincronizando milhares de items. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#ulTiming').append(`<li>Sincronização ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Sincronização de items em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000);

    $('#ulTiming').append(`<li>Sincronizando <span id="liItems">${itemsTables.length}</span> de ${itemsTables.length} tabelas as ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of itemsTables
    _.forEach(itemsTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                let theColumns;
                theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                let sqlInst = '';

                sqlInst += `delete from ${table}; `;
                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                sqlInst += `set identity_insert ${table} on; `;
                sqlInst += `declare @list_${table + '_' + index} varchar(max); `;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {
                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
                        sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                    });

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {
                        console.log(`Sincronizado ${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liItems').html(counter);

                        if (counter == 0) {

                            done = true;

                            let totalTiming = moment.utc(moment(new Date()).diff(moment(start))).format('mm:ss');
                            $('#ulTiming').append(`<li>Dados de entradas sincronizados em ${totalTiming}.</li>`);

                            sqlDb.connect(dbDest).then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    sqlDb.close();

                                    if ($btn.id == 'btnStartSync') {
                                        let totalTiming = moment.utc(moment(new Date()).diff(moment(startingTime))).format('mm:ss');
                                        $('#ulTiming').append(`<li>Tempo total: ${totalTiming}.</li>`);
                                    }

                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Sincronização executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });

                                    NProgress.done();
                                    clearInterval(myVal);
                                    clearInterval(timer);
                                    mainWin.setProgressBar(1.0);
                                    mainWin.setProgressBar(0);

                                    notifier.notify({
                                            title: 'Sincronizador',
                                            message: 'Dados sincronizados com sucesso.',
                                            sound: true, // true | false.
                                            wait: true, // Wait for User Action against Notification
                                            icon: path.join(__dirname, 'img/icon.png'),
                                            // timeout: 10
                                        },
                                        function (err, response) {
                                            // Response is response from notification
                                            console.log(response);
                                        });

                                    notifier.on('click', function (notifierObject, options) {
                                        mainWin.focus();
                                    });
                                }).catch(err => {
                                    sqlError(err);
                                    clearInterval(myVal);
                                    clearInterval(timer);
                                    $($btn).attr('disabled', false);
                                });
                            }).catch(err => {
                                sqlError(err);
                                clearInterval(myVal);
                                clearInterval(timer);
                                $($btn).attr('disabled', false);
                            });
                        }
                    }).catch(err => {

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                // console.log(result);
                                $('#ulTiming').append(`<li class="error">Erro: Reativando os gatilhos e chaves as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                NProgress.done();
                            }).catch(err => {
                                sqlError(err);
                            });
                        }).catch(err => {
                            sqlError(err);
                        });

                        sqlError(err);
                        clearInterval(myVal);
                        clearInterval(timer);
                        $($btn).attr('disabled', false);
                    });
                }).catch(function (err) {
                    sqlError(err);
                    clearInterval(myVal);
                    clearInterval(timer);
                    $($btn).attr('disabled', false);
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

function sqlError(err) {
    console.log(err);
    $('#ulTiming').append(`<li class="error">Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
    NProgress.done();
    mainWin.setProgressBar(1.0);
    mainWin.setProgressBar(0);
    new PNotify({
        title: "Erro",
        text: err,
        type: 'error',
        icon: false,
        addclass: "stack-bottomright"
    });
    sqlDb.close();
};

function formatValue2(value, sqlSelIn) {
    if (value == null) {
        sqlSelIn += `${null}, `;
    } else if (value instanceof Date) {
        sqlSelIn += `'${moment(value).format('DD/MM/YYYY HH:mm')}', `;
    } else if (isNaN(value)) {
        sqlSelIn += `'${value.replace(/["']/g, "")}', `;
    } else if (value == true) {
        if (value == 1) {
            sqlSelIn += `1, `;
        } else {
            if (isNaN(value)) {
                sqlSelIn += `'${value.replace(/["']/g, "")}', `;
            } else {
                sqlSelIn += `${value.replace(/["']/g, "")}, `;
            }
        }
    } else if (value == false) {
        if (value.length == 1) {
            sqlSelIn += `0, `;
        } else {
            sqlSelIn += `'${value.toString()}', `;
        }
    } else {
        if (value.length > 10) {
            sqlSelIn += `'${value.replace(/["']/g, "")}', `;
        } else {
            sqlSelIn += `${value.toString()}, `;
        }
    }
    return sqlSelIn;
};

function formatValue1(data, sqlSelIn) {
    _.forEach(data, function (value) {
        if (value == null) {
            sqlSelIn += `${null}, `;
        } else if (value instanceof Date) {
            sqlSelIn += `''${moment(value).format('DD/MM/YYYY HH:mm')}'', `;
        } else if (isNaN(value)) {
            sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
        } else if (value == true) {
            if (value == 1) {
                sqlSelIn += `1, `;
            } else {
                if (isNaN(value)) {
                    sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
                } else {
                    sqlSelIn += `${value.replace(/["']/g, "")}, `;
                }
            }
        } else if (value == false) {
            if (value.length == 1) {
                sqlSelIn += `0, `;
            } else {
                sqlSelIn += `''${value.toString()}'', `;
            }
        } else {
            if (value.length > 10) {
                sqlSelIn += `''${value.replace(/["']/g, "")}'', `;
            } else {
                sqlSelIn += `${value.toString()}, `;
            }
        }
    });
    return sqlSelIn;
};

function removeValue(list, value, separator) {
    separator = separator || ",";
    let values = list.split(",");
    for (let i = 0; i < values.length; i++) {
        if (values[i] == value) {
            values.splice(i, 1);
            return values.join(",");
        }
    }
    let s = '';
    return list;
};

function dateDiff(timestamp) {
    let d = Math.abs(timestamp - new Date().getTime()) / 1000; // delta
    let r = {}; // result
    let s = { // structure
        year: 31536000,
        month: 2592000,
        week: 604800, // uncomment row to ignore
        day: 86400, // feel free to add your own row
        hour: 3600,
        minute: 60,
        second: 1
    };

    Object.keys(s).forEach(function (key) {
        r[key] = Math.floor(d / s[key]);
        d -= r[key] * s[key];
    });

    return r;
};

function n(n) {
    return n > 9 ? "" + n : "0" + n;
};

let chunks = function (array, size) {

    let results = [];
    while (array.length) {
        results.push(array.splice(0, size));
    }
    return results;
};

ipcRenderer.on('startSyncComunication', (event, message) => {
    startSyncComunication();
});

let startSyncComunication = function () {
    let socket = io(`http://${broadServer}`);

    let msg = {
        username: os.userInfo().username,
        type: "syncing",
        message: "Sincronização em andamento. Favor não utilizar o SGI.<br />Uma nova notificação será emitida para liberação do uso do sistema."
    };

    socket.emit('messages', JSON.stringify(msg));

    remote.dialog.showMessageBox({
        type: 'info',
        title: "Informativo",
        message: "Notificação enviada!",
        buttons: ["OK"]
    });
};

ipcRenderer.on('endSyncComunication', (event, message) => {
    endSyncComunication();
});

let endSyncComunication = function () {
    let socket = io(`http://${broadServer}`);

    let msg = {
        username: os.userInfo().username,
        type: "done",
        message: "Sincronização concluida.<br />SGI liberado para uso."
    };

    socket.emit('messages', JSON.stringify(msg));

    remote.dialog.showMessageBox({
        type: 'info',
        title: "Informativo",
        message: "Notificação enviada!",
        buttons: ["OK"]
    });
};