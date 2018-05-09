const {
    ipcRenderer,
    remote
} = eRequire('electron');
const os = eRequire('os');
const fse = eRequire('fs-extra');
const _ = eRequire("lodash");
const moment = eRequire('moment');
const sqlDb = eRequire("mssql");
const notifier = require('node-notifier');
const path = require('path');

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
    config = {},
    permanotice,
    syncStock,
    syncActive,
    syncNewItems,
    syncComission,
    syncCost,
    syncPrice,
    syncCategory,
    syncGroup;

fse.mkdirsSync(destPath);
fse.mkdirsSync(destPath + '\\config');
fse.mkdirsSync(destPath + '\\tabelas');

fse.readFile(`${destPath}\\config\\config.json`, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let fileRead = fse.readFileSync(`${destPath}\\config\\config.json`, 'utf8');
    config = JSON.parse(fileRead);

    syncStock = config.syncStock;
    syncActive = config.syncActive;
    syncNewItems = config.syncNewItems;
    synComission = config.synComission;
    syncCost = config.syncCost;
    syncPrice = config.syncPrice;
    syncCategory = config.syncCategory;
    syncGroup = config.syncGroup;
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

var stack_topleft = {
    "dir1": "down",
    "dir2": "right",
    "push": "top"
};

$(function () {

    $('#productsPasswordModal, #peoplePasswordModal, #itemsPasswordModal, #logModal').modal();

    // console.log(destPath);
    storage.setDataPath(destPath);

    storage.remove(destPath + '\\tabelas', function (error) {
        if (error) throw error;
    });

    // Backup click
    $('#btnBackup').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;
        $($btn).attr('disabled', true);

        NProgress.configure({
            minimum: 0.1,
            speed: 2000,
            trickleSpeed: 2000,
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

            $('#btnOpenProductsModal').removeClass('disabled');
            $('#btnOpenPeopleModal').removeClass('disabled');
            $('#btnOpenItemsModal').removeClass('disabled');
            $('#btnSyncProducts').removeClass('disabled');
            $('#btnSyncPeople').removeClass('disabled');
            if (syncNewItems)
                $('#btnSyncItems').removeClass('disabled');

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

    // Sync people click
    $('#btnSyncPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        syncPeople($btn);
    });

    // Sync products click
    $('#btnSyncProducts').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        syncProducts($btn);
    });

    // Sync items click
    $('#btnSyncItems').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        syncItems($btn);
    });

    // Replicate people click
    $('#btnRepPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        if ($('#peoplePasswd').val() == 'sftk123') {
            repPeople($btn);
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

        let $btn = this;

        if ($('#productsPasswd').val() == 'sftk123') {
            NProgress.configure({
                minimum: 0.1,
                speed: 2000,
                trickleSpeed: 2000,
                parent: '#barProgress'
            }).start();

            $('#logModal .modal-content h5').html('Replicando Produtos!');
            $('#logModal').modal('open');
            $('#btnOpenLog').removeClass('hide');
            $('#productsPasswordModal').modal('close');

            $("#ulTiming").empty();
            $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;")
            }).then(result => {
                sqlDb.close();

                repProducts($btn);
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

        let $btn = this;

        if ($('#itemsPasswd').val() == 'sftk123') {
            repItems($btn);
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

    $('.tooltipHelp').mouseover(function (ele) {
        let msg = $(ele.currentTarget).data().tooltip;

        if (permanotice) {
            permanotice.open();
            permanotice.update({
                text: msg
            });
        } else {
            permanotice = new PNotify({
                title: 'Info!',
                addclass: 'tooltip',
                text: msg,
                type: 'warning',
                icon: false,
                addclass: "stack-topright",
                stack: stack_topleft
            });
        }
    });

    $('.tooltipHelp').mouseout(function (ele) {
        if (permanotice) permanotice.remove();
    });
});

function repPeople($btn) {
    $($btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        speed: 2000,
        trickleSpeed: 2000,
        parent: '#barProgress'
    }).start();

    $('#logModal .modal-content h5').html('Replicando Pessoas!');
    $('#logModal').modal('open');
    $('#btnOpenLog').removeClass('hide');
    $('#peoplePasswordModal').modal('close');

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
    }).then(result => {
        sqlDb.close();
        getPeople($btn);
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
};

function getPeople(btn) {
    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados de pessoas as ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));

            starting = new Date();

            let counter = peopleTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(peopleTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
            clearInterval(myVal);
            done = true;
            NProgress.done();
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
};

function importPeople(btn) {
    let $btn = btn;

    let counter = peopleTables.length,
        lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
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

    $('#ulTiming').append(`<li>Replicando <span id="liTiming">${peopleTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (table, index) {

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

                lineCount++;

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
                        // console.log(moment(new Date()).format('HH:mm:ss'));
                        // console.log(result);

                        // $('#ulTiming').append(`<li>${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liTiming').html(counter);

                        if (counter == 0) {

                            sqlDb.connect(dbDest).then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);

                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Replicação executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });

                                    done = true;
                                    $('#btnOpenPeopleModal').addClass('disabled');
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        clearInterval(myVal);
                        sqlDb.close();

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                $('#btnOpenPeopleModal').addClass('disabled');
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

                        new PNotify({
                            title: "Erro",
                            text: err,
                            type: 'error',
                            icon: false,
                            addclass: "stack-bottomright"
                        });
                    });
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

function repProducts(btn) {
    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (item, index) {
        sqlGet += `select * from view_${item}_sinc; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo produtos ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));
            // console.log(data);
            starting = new Date();

            // $('#ulTiming').append(`<li>Tabela ${item} importada em (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})</li>`);
            // starting = new Date();

            let counter = productsTables.length;
            _.forEach(productsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                                $('#ulTiming').append(`<li>Produtos adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                sqlDb.close();
                                importProducts(btn);
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
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            sqlError(err);
        });
    });
};

function getProducts(btn) {

    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo produtos ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));
            // console.log(data);
            starting = new Date();

            // $('#ulTiming').append(`<li>Tabela ${item} importada em (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})</li>`);
            // starting = new Date();

            let counter = productsTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(productsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;

                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                                $('#ulTiming').append(`<li>Produtos adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
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
                        // importProducts(data.recordsets[index].columns);
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
            clearInterval(myVal);
            NProgress.done();
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
};

function importProducts(btn) {
    let $btn = btn;

    let counter = productsTables.length,
        lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
            if (dateDiff(starting.getTime()).minute >= 1) {
                switch (dateDiff(starting.getTime()).minute) {
                    case 2:
                        $('#ulTiming').append(`<li>Adiquerindo milhares de produtos. Aguarde...</li>`);
                        break;
                    case 3:
                        $('#ulTiming').append(`<li>Transferência ainda em andamento. Aguarde...</li>`);
                        break;
                    default:
                        $('#ulTiming').append(`<li>Adiquerindo produtos em andamento. Aguarde...</li>`);
                        break;
                }
            }
        }
    }, 60000);

    $('#ulTiming').append(`<li>Replicando <span id="liProduct">${productsTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (table, index) {

        let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

        sqlInst += `delete from ${table}; `;
        sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
        sqlInst += `set identity_insert ${table} on; `;

        lineCount++;

        const file = `${destPath}\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                let theColumns = fse.readFileSync(`${destPath}\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\${table}.json`, 'utf8');

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

                starting = new Date();

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {

                        console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                        counter = counter - 1;

                        $('#liProduct').html(counter);

                        if (counter == 0) {

                            done = true;

                            sqlDb.connect(dbDest).then(pool => {
                                pool.request().query("exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;").then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Importação executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                });
                            });

                            // sqlDb.close();
                        }
                    }).catch(err => {
                        console.log(err);
                        // $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                        clearInterval(myVal);
                        NProgress.done();
                        sqlDb.close();

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            pool.request().query("exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;").then(result => {
                                console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                sqlDb.close();
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
                    });
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

function repItems(btn) {
    $($btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        speed: 2000,
        trickleSpeed: 2000,
        parent: '#barProgress'
    }).start();

    $('#logModal .modal-content h5').html('Replicando Entradas!');
    $('#logModal').modal('open');
    $('#btnOpenLog').removeClass('hide');
    $('#itemsPasswordModal').modal('close');

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
    }).then(result => {
        sqlDb.close();
        getItems($btn);
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
};

function getItems(btn) {

    let $btn = btn;
    $($btn).attr('disabled', true);

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of itemsTables
    _.forEach(itemsTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo itens ${moment(new Date()).format('HH:mm:ss')}.</li>`);
        // NProgress.configure({
        //     minimum: 0.1,
        //     trickleSpeed: 2000
        // }).start();

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));

            starting = new Date();

            let counter = itemsTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(itemsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                                $('#ulTiming').append(`<li>Itens adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
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
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
            clearInterval(myVal);
            done = true;
            NProgress.done();
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
};

function importItems(btn) {

    let $btn = btn;

    let counter = itemsTables.length,
        lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
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

    $('#ulTiming').append(`<li>Replicando <span id="liTiming">${itemsTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

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

                lineCount++;

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
                        // console.log(moment(new Date()).format('HH:mm:ss'));
                        // console.log(result);

                        // $('#ulTiming').append(`<li>${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liTiming').html(counter);

                        if (counter == 0) {

                            sqlDb.connect(dbDest).then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);

                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Replicação executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });

                                    done = true;
                                    $('#btnOpenItemsModal').addClass('disabled');
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                });
                            });

                            // sqlDb.close();
                        }
                    }).catch(err => {
                        console.log(err);
                        // $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                        clearInterval(myVal);
                        sqlDb.close();

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright"
                                });
                                $('#btnOpenItemsModal').addClass('disabled');
                                NProgress.done();
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

                        new PNotify({
                            title: "Erro",
                            text: err,
                            type: 'error',
                            icon: false,
                            addclass: "stack-bottomright"
                        });
                    });
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

function syncPeople(btn) {
    let $btn = btn;
    $(btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        speed: 2000,
        trickleSpeed: 2000,
        parent: '#barProgress'
    }).start();

    $('#logModal .modal-content h5').html('Sincronizando Pessoas!');
    $('#logModal').modal('open');
    $('#btnOpenLog').removeClass('hide');

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
    }).then(result => {
        sqlDb.close();
        getPeopleSync($btn);
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
};

function getPeopleSync(btn) {
    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    var timer = setInterval(function () {
        if (NProgress.status !== null) {
            mainWin.setProgressBar(NProgress.status);
        } else {
            mainWin.setProgressBar(1.0);
            mainWin.setProgressBar(0);
            console.log('\ncomplete\n');
            clearInterval(timer);
        }
    }, 100);

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados... ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));

            starting = new Date();

            let counter = peopleTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(peopleTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                                $('#ulTiming').append(`<li>Dados adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
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
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
            clearInterval(myVal);
            done = true;
            NProgress.done();
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
};

function importPeopleSync(btn) {
    let $btn = btn;

    let counter = peopleTables.length,
        lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
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

    $('#ulTiming').append(`<li>Sincronizando <span id="liTiming">${peopleTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (table, index) {

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

                lineCount++;

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
                        // console.log(moment(new Date()).format('HH:mm:ss'));
                        // console.log(result);

                        console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liTiming').html(counter);

                        if (counter == 0) {

                            sqlDb.connect(dbDest).then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Sincronização executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    done = true;
                                    NProgress.done();

                                    notifier.notify({
                                        title: 'Sincronizador',
                                        message: 'Dados de pessoas sincronizados.',
                                        wait: true,
                                        icon: path.join(__dirname, 'img/icon.png')
                                    });
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                });
                            });
                        }
                    }).catch(err => {
                        console.log(err);
                        // $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                        clearInterval(myVal);
                        sqlDb.close();

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
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

                        new PNotify({
                            title: "Erro",
                            text: err,
                            type: 'error',
                            icon: false,
                            addclass: "stack-bottomright"
                        });
                    });
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

function syncProducts(btn) {
    let $btn = btn;
    $(btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        speed: 2000,
        trickleSpeed: 2000,
        parent: '#barProgress'
    }).start();

    $('#logModal .modal-content h5').html('Sincronizando Produtos!');
    $('#logModal').modal('open');
    $('#btnOpenLog').removeClass('hide');

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
    }).then(result => {
        sqlDb.close();
        getProductsSync($btn);
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
};

function getProductsSync(btn) {
    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

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
                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
            done = true;
            NProgress.done();
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
};

function importProductsSync(btn) {
    let $btn = btn;

    let counter = productsTables.length,
        lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
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

    $('#ulTiming').append(`<li>Sincronizando <span id="liTiming">${productsTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    let sqlInst = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                if (table == 'produto') {
                    lineCount++;

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

                    starting = new Date();

                    // adding to sql database
                    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                        pool.request().query(sqlInst).then(result => {
                            // console.log(moment(new Date()).format('HH:mm:ss'));
                            // console.log(result);

                            // $('#ulTiming').append(`<li>${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                            console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

                            counter = counter - 1;

                            $('#liTiming').html(counter);

                            if (counter == 0) {

                                sqlDb.connect(dbDest).then(pool => {
                                    let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                    pool.request().query(sqlEndInst).then(result => {
                                        // console.log(result);
                                        sqlDb.close();
                                        $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);

                                        new PNotify({
                                            title: "Sucesso",
                                            text: "Sincronização executada com sucesso.",
                                            type: 'success',
                                            icon: false,
                                            addclass: "stack-bottomright"
                                        });

                                        done = true;
                                        NProgress.done();

                                        sqlDb.connect(dbOrigin).then(pool => {
                                            pool.request().query('update produto set sinc = 1;').then(result => {
                                                // console.log(result);
                                                sqlDb.close();
                                            }).catch(err => {
                                                console.log(err);
                                                sqlDb.close();
                                                new PNotify({
                                                    title: "Erro",
                                                    text: err,
                                                    type: 'error',
                                                    icon: false,
                                                    addclass: "stack-bottomright"
                                                });
                                            });
                                        });

                                    }).catch(err => {
                                        console.log(err);
                                        sqlDb.close();
                                        new PNotify({
                                            title: "Erro",
                                            text: err,
                                            type: 'error',
                                            icon: false,
                                            addclass: "stack-bottomright"
                                        });
                                        NProgress.done();
                                    });
                                });
                            }
                        }).catch(err => {
                            console.log(err);
                            // $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                            clearInterval(myVal);
                            sqlDb.close();

                            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    sqlDb.close();
                                    $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                    new PNotify({
                                        title: "Erro",
                                        text: result,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    sqlDb.close();
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    NProgress.done();
                                });
                            });
                        });
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

                    lineCount++;

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
                            // console.log(moment(new Date()).format('HH:mm:ss'));
                            // console.log(result);

                            // $('#ulTiming').append(`<li>${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                            console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                            starting = new Date();

                            counter = counter - 1;

                            $('#liTiming').html(counter);

                            if (counter == 0) {

                                sqlDb.connect(dbDest).then(pool => {
                                    let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                    pool.request().query(sqlEndInst).then(result => {
                                        // console.log(result);
                                        $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);

                                        new PNotify({
                                            title: "Sucesso",
                                            text: "Replicação executada com sucesso.",
                                            type: 'success',
                                            icon: false,
                                            addclass: "stack-bottomright"
                                        });

                                        done = true;
                                        $('#btnOpenItemsModal').addClass('disabled');
                                        NProgress.done();
                                    }).catch(err => {
                                        console.log(err);
                                        new PNotify({
                                            title: "Erro",
                                            text: err,
                                            type: 'error',
                                            icon: false,
                                            addclass: "stack-bottomright"
                                        });
                                    });
                                });

                                // sqlDb.close();
                            }
                        }).catch(err => {
                            console.log(err);
                            // $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                            clearInterval(myVal);
                            sqlDb.close();

                            new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    console.log(result);
                                    $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                    sqlDb.close();
                                    new PNotify({
                                        title: "Erro",
                                        text: result,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });
                                    $('#btnOpenItemsModal').addClass('disabled');
                                    NProgress.done();
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

                            new PNotify({
                                title: "Erro",
                                text: err,
                                type: 'error',
                                icon: false,
                                addclass: "stack-bottomright"
                            });
                        });
                    });
                }
            } else {
                counter = counter - 1;
            }
        });
    });
};

function syncItems(btn) {
    let $btn = btn;
    $(btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        speed: 2000,
        trickleSpeed: 2000,
        parent: '#barProgress'
    }).start();

    $('#logModal .modal-content h5').html('Sincronizando Entradas!');
    $('#logModal').modal('open');
    $('#btnOpenLog').removeClass('hide');

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem as ${(new Date()).toLocaleTimeString()}.</li>`);

    new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
        return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
    }).then(result => {
        sqlDb.close();
        getItemsSync($btn);
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
};

function getItemsSync(btn) {
    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of itemsTables
    _.forEach(itemsTables, function (item, index) {
        sqlGet += `select * from sinc_${item}_view; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo itens ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));

            starting = new Date();

            let counter = itemsTables.length;
            storage.setDataPath(destPath + '\\tabelas');
            _.forEach(itemsTables, function (item, index) {
                if (data.recordsets[index].length) {
                    storage.set(item, data.recordsets[index], function (error) {
                        if (error)
                            throw error;
                        console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);

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
                                $('#ulTiming').append(`<li>Itens adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
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
                    }
                }
            });

        }).catch(err => {
            console.log(err);
            $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
            clearInterval(myVal);
            done = true;
            NProgress.done();
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
};

function importItemsSync(btn) {
    let $btn = btn;

    let counter = itemsTables.length,
        lineCount = 0,
        start = new Date(),
        starting = new Date(),
        timerCount = 1;

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
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

    $('#ulTiming').append(`<li>Sincronizando <span id="liTiming">${itemsTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

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

                lineCount++;

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
                        // console.log(moment(new Date()).format('HH:mm:ss'));
                        // console.log(result);

                        // $('#ulTiming').append(`<li>${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liTiming').html(counter);

                        if (counter == 0) {

                            sqlDb.connect(dbDest).then(pool => {
                                let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);

                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Sincronização executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright"
                                    });

                                    done = true;
                                    NProgress.done();

                                    notifier.notify({
                                        title: 'Sincronizador',
                                        message: 'Dados de entradas sincronizados.'
                                    });
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright"

                                    });
                                });
                            });

                            // sqlDb.close();
                        }
                    }).catch(err => {
                        console.log(err);
                        // $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                        clearInterval(myVal);
                        sqlDb.close();

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            let sqlEndInst = "exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
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

                        new PNotify({
                            title: "Erro",
                            text: err,
                            type: 'error',
                            icon: false,
                            addclass: "stack-bottomright"
                        });
                    });
                });
                // end of adding
            } else {
                counter = counter - 1;
            }
        });
    });
};

// ipcRenderer.on('openSyncsWindow', function (event, args) {
//     $('#syncsPasswordModal').modal('open');
//     setTimeout(function () {
//         $('#syncsPasswd').focus();
//     }, 500);
// });

function sqlError(err) {
    $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
    NProgress.done();
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