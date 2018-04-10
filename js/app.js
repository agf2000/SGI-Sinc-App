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

let destPath = 'c:\\softer\\Sincronizador';

let dbOrigin = {},
    dbDest = {},
    config = {};

fse.mkdirsSync(destPath);
fse.mkdirsSync(destPath + '\\config');
fse.mkdirsSync(destPath + '\\tabelas');

fse.readFile(`${destPath}\\config\\dbOrigin.json`, function (err, data) {
    if (err) {
        $('.btn').removeClass('disabled');
        new PNotify({
            title: "Atenção",
            text: "Favor configrar o servidor de origem.<br />Aperte o ALT para ter acesso ao menu.",
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
            text: "Favor configrar o servidor de destino.<br />Aperte o ALT para ter acesso ao menu.",
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

// fse.readFile(`${destPath}\\config.json`, function (err, data) {
//     if (err) {
//         return console.log(err);
//     }
//     let fileRead = fse.readFileSync(`${destPath}\\config.json`, 'utf8');
//     config = JSON.parse(fileRead);

// $('#syncStock').prop('checked', true);
// $('#syncActive').prop('checked', true);
// $('#syncComission').prop('checked', true);
// $('#syncCost').prop('checked', true);
// $('#syncPrice').prop('checked', true);
// });

const peopleFile = `${destPath}\\config\\people_table.txt`,
    productsFile = `${destPath}\\config\\products_table.txt`,
    itemsFile = `${destPath}\\config\\items_table.txt`;

let peopleTableList = '',
    peopleTables = '',
    productsTableList = '',
    productsTables = '',
    itemsTableList = '',
    itemsTables = '',
    done = false;

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

$(function () {

    $('#productsPasswordModal, #peoplePasswordModal, #itemsPasswordModal, #logModal, #syncsModal').modal();

    // console.log(destPath);
    storage.setDataPath(destPath);

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
            $('#btnSyncItems').removeClass('disabled');

            new PNotify({
                title: "Sucesso!",
                text: "banco de dados copiado.",
                type: 'success',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
            });
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
    });

    // Sync people click
    $('#btnSyncPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        // SyncPeople($btn);
        RepPeople($btn);
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

        // SyncItems($btn);
        RepItems($btn);
    });

    // Replicate people click
    $('#btnRepPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        if ($('#peoplePasswd').val() == 'sftk123') {
            RepPeople($btn);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
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
            RepProducts($btn);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
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
            RepItems($btn);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
            });
            $('#itemsPasswd').val(null);
        }
    });
});

function RepPeople($btn) {
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
            addclass: "stack-bottomright",
            delay: 6000
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
        sqlGet += `select * from view_${item}_sinc; `;
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
                addclass: "stack-bottomright",
                delay: 6000
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
                sqlInst += `declare @list_${table + '_' + index.toString()} varchar(max); `;

                lineCount++;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index.toString()} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {

                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
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
                                        addclass: "stack-bottomright",
                                        delay: 6000
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
                                        addclass: "stack-bottomright",
                                        delay: 6000
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
                                    addclass: "stack-bottomright",
                                    delay: 6000
                                });
                                $('#btnOpenPeopleModal').addClass('disabled');
                                NProgress.done();
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
                        });

                        new PNotify({
                            title: "Erro",
                            text: err,
                            type: 'error',
                            icon: false,
                            addclass: "stack-bottomright",
                            delay: 6000
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

function RepProducts($btn) {
    $($btn).attr('disabled', true);

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
        return pool.request().query("set language portuguese; exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; exec sp_desabilitar_chaves;");
    }).then(result => {
        // let rows = result.recordset
        // res.setHeader('Access-Control-Allow-Origin', '*')
        // res.status(200).json(rows);
        // console.log(result);
        sqlDb.close();
        getProducts($btn);
    }).catch(err => {
        // res.status(500).send({
        //     message: "${err}"
        // })
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

function getProducts(btn) {

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
                                // importProducts(data.recordsets[index].columns);
                                importProducts($btn);
                            }
                        });
                    });
                    // _.forEach(data.recordsets[index].columns, function (column) {
                    //     console.log(column.name);
                    // });
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
                addclass: "stack-bottomright",
                delay: 6000
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
                        $('#ulTiming').append(`<li>Replicando milhares de dados de produtos. Aguarde...</li>`);
                        break;
                    case 4:
                        $('#ulTiming').append(`<li>Replicação de dados de produtos em andamento. Aguarde...</li>`);
                        break;
                    default:
                        $('#ulTiming').append(`<li>Replicação de dados de produtos em andamento. Aguarde...</li>`);
                        break;
                }
            }
        }
    }, 60000);

    $('#ulTiming').append(`<li>Replicando <span id="liTiming">${productsTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    let sqlInst = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (table, index) {

        const file = `${destPath}\\tabelas\\${table}.json`;

        fse.pathExists(file, (err, exists) => {
            if (exists) {

                let theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                sqlInst += `delete from ${table}; `;
                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                sqlInst += `set identity_insert ${table} on; `;
                sqlInst += `declare @list_${table + '_' + index.toString()} varchar(max); `;

                lineCount++;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index.toString()} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {

                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
                        sqlSel += sqlSelIn.replace(/,\s*$/, " ");
                    });

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index.toString()}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;

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
                                let sqlEndInst = "update produto set sinc = 1; exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                                pool.request().query(sqlEndInst).then(result => {
                                    // console.log(result);
                                    $('#ulTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);

                                    new PNotify({
                                        title: "Sucesso",
                                        text: "Replicação executada com sucesso.",
                                        type: 'success',
                                        icon: false,
                                        addclass: "stack-bottomright",
                                        delay: 6000
                                    });

                                    done = true;
                                    $('#btnOpenProductsModal').addClass('disabled');
                                    NProgress.done();
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
                                    NProgress.done();
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
                            let sqlEndInst = "update produto set sinc = 1; exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;";
                            pool.request().query(sqlEndInst).then(result => {
                                // console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright",
                                    delay: 6000
                                });
                                sqlDb.close();
                                $('#btnOpenProductsModal').addClass('disabled');
                                NProgress.done();

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
                                NProgress.done();
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

function RepItems($btn) {
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
            addclass: "stack-bottomright",
            delay: 6000
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
        sqlGet += `select * from view_${item}_sinc; `;
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
                addclass: "stack-bottomright",
                delay: 6000
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
                sqlInst += `declare @list_${table + '_' + index.toString()} varchar(max); `;

                lineCount++;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table + '_' + index.toString()} = `;

                    let sqlSel = `'`;
                    _.forEach(parts, function (data) {

                        sqlSel += `select `;
                        let sqlSelIn = '';
                        sqlSelIn = formatValue1(data, sqlSelIn);
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
                                        addclass: "stack-bottomright",
                                        delay: 6000
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
                                        addclass: "stack-bottomright",
                                        delay: 6000
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
                                    addclass: "stack-bottomright",
                                    delay: 6000
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
                                    addclass: "stack-bottomright",
                                    delay: 6000
                                });
                                sqlDb.close();
                            });
                        });

                        new PNotify({
                            title: "Erro",
                            text: err,
                            type: 'error',
                            icon: false,
                            addclass: "stack-bottomright",
                            delay: 6000
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

function syncProducts($btn) {
    $($btn).attr('disabled', true);

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
            addclass: "stack-bottomright",
            delay: 6000
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
                if (!$('#syncCost').prop('checked')) {
                    sqlGet += 'select * from custoproduto; ';
                } else {
                    productsTables = productsTables.filter(e => e !== 'custoproduto');
                }
                break;
            case 'produto':
                // sqlGet += 'select top 3 * into #temp_produto from view_produto_sinc; ';

                // if ($('#syncPrice').prop('checked'))
                //     sqlGet += 'alter table #temp_produto drop column preco; ';

                // if ($('#syncStock').prop('checked'))
                //     sqlGet += 'alter table #temp_produto drop column estoque; ';

                // if ($('#syncComission').prop('checked'))
                //     sqlGet += 'alter table #temp_produto drop column comissao; ';

                // if ($('#syncActive').prop('checked'))
                //     sqlGet += 'alter table #temp_produto drop column ativo_pdv; ';

                // sqlGet += 'select * from #temp_produto; drop table #temp_produto; ';

                sqlGet += `select * from view_${item}_sinc where isnull(sinc, 0) = 0 order by data_cadastro desc; `;
                break;
            default:
                sqlGet += `select * from view_${item}_sinc; `;
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
                addclass: "stack-bottomright",
                delay: 6000
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
            if (dateDiff(starting.getTime()).minute >= 1) {
                switch (dateDiff(starting.getTime()).minute) {
                    case 2:
                        $('#ulTiming').append(`<li>Sincronizando milhares de produtos. Aguarde...</li>`);
                        break;
                    case 3:
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

                lineCount++;

                let theColumns = fse.readFileSync(`${destPath}\\tabelas\\${table}_columns.json`, 'utf8');
                let dataFromFile = fse.readFileSync(`${destPath}\\tabelas\\${table}.json`, 'utf8');

                let jsonData = chunks(JSON.parse(dataFromFile), 1000);

                sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

                if (table !== 'produto') {
                    sqlInst += `delete from ${table}; `;
                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += `set identity_insert ${table} on; `;
                } else {
                    sqlInst += `select top 0 * into #sinc_${table}_${lineCount} from ${table}; `;
                    sqlInst += `set identity_insert #sinc_${table}_${lineCount} on; `;
                }

                sqlInst += `declare @list_${table}_${index.toString()} varchar(max); `;

                _.forEach(jsonData, function (parts) {

                    sqlInst += `set @list_${table}_${index.toString()} = `;

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

                    if (table == 'produto') {
                        sqlInst += `${sqlSel}' insert into #sinc_${table}_${lineCount} (`;
                    } else {
                        sqlInst += `${sqlSel}' insert into ${table} (`;
                    }

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table}_${index.toString()}); `;
                });

                if (table == 'produto') {
                    sqlInst += `update p_${lineCount} set `;

                    let columnParts = theColumns.replace(/['"]+/g, '').split(',');

                    sqlSel = '';
                    let sqlUpdate = '';
                    _.forEach(columnParts, function (prop) {
                        if ((prop !== 'codigo') &&
                            ($('#syncPrice').prop('checked') && prop !== 'preco') &&
                            ($('#syncStock').prop('checked') && prop !== 'estoque') &&
                            ($('#syncComission').prop('checked') && prop !== 'comissao') &&
                            ($('#syncActive').prop('checked') && prop !== 'ativo')) {
                            sqlUpdate += `p_${lineCount}.${prop} = p_${lineCount}2.${prop}, `;
                        }
                    });

                    sqlSel = sqlUpdate.replace(/,\s*$/, " ");

                    sqlInst += sqlSel + ' ';
                    sqlInst += `from ${table} as p_${lineCount} `;
                    sqlInst += `inner join #sinc_${table}_${lineCount} as p_${lineCount}2 on p_${lineCount}.codigo = p_${lineCount}2.codigo; `;

                    sqlInst += `set identity_insert #sinc_${table}_${lineCount} off; `;

                    sqlInst += `set identity_insert ${table} on; `;

                    sqlInst += `insert into ${table} ( `;

                    sqlSel = '';
                    sqlUpdate = '';
                    _.forEach(columnParts, function (prop) {
                        if (($('#syncPrice').prop('checked') && prop !== 'preco') &&
                            ($('#syncStock').prop('checked') && prop !== 'estoque') &&
                            ($('#syncComission').prop('checked') && prop !== 'comissao') &&
                            ($('#syncActive').prop('checked') && prop !== 'ativo')) {
                            sqlUpdate += `${prop}, `;
                        }
                    });
                    sqlSel = sqlUpdate.replace(/,\s*$/, " ");
                    sqlInst += sqlSel + ') ';

                    sqlSel = '';
                    sqlUpdate = 'select ';
                    _.forEach(columnParts, function (prop) {
                        if (($('#syncPrice').prop('checked') && prop !== 'preco') &&
                            ($('#syncStock').prop('checked') && prop !== 'estoque') &&
                            ($('#syncComission').prop('checked') && prop !== 'comissao') &&
                            ($('#syncActive').prop('checked') && prop !== 'ativo')) {
                            sqlUpdate += `#sinc_${table}_${lineCount}.${prop}, `;
                        }
                    });
                    sqlSel = sqlUpdate.replace(/,\s*$/, " ");
                    sqlInst += sqlSel + ' ';

                    sqlInst += `from #sinc_${table}_${lineCount} `;
                    // sqlInst += `left outer join ${table} on ${table}.codigo = #sinc_${table}_${lineCount}.codigo `;
                    sqlInst += `where not #sinc_${table}_${lineCount}.codigo in (select codigo from ${table}); `;

                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += 'begin ';
                    sqlInst += `set identity_insert #sinc_${table}_${lineCount} off; `;
                    sqlInst += `drop table #sinc_${table}_${lineCount}; `;
                    sqlInst += `set identity_insert ${table} off; `;
                    sqlInst += 'end; ';
                } else {
                    sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1) `;
                    sqlInst += `set identity_insert ${table} off; `;
                }

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
                                        addclass: "stack-bottomright",
                                        delay: 6000
                                    });

                                    if (table == 'produto') {
                                        sqlDb.connect(dbOrigin).then(pool => {
                                            pool.request().query('update produto set sinc = 1; ').then(result => {
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
                                    }

                                    done = true;
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    sqlDb.close();
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright",
                                        delay: 6000
                                    });
                                    NProgress.done();
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
                                // console.log(result);
                                sqlDb.close();
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright",
                                    delay: 6000
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
                                    addclass: "stack-bottomright",
                                    delay: 6000
                                });
                                NProgress.done();
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

ipcRenderer.on('openSyncsWindow', function (event, args) {
    $('#syncsModal').modal('open');
});

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

function syncSettings() {
    setTimeout(function () {
        let params = {
            syncStock: $('#syncStock').prop('checked'),
            syncActive: $('#syncActive').prop('checked'),
            syncComission: $('#syncComission').prop('checked'),
            syncCost: $('#syncCost').prop('checked'),
            syncPrice: $('#syncPrice').prop('checked')
        };

        storage.set('config', params, function (error) {
            if (error)
                throw error;
        });
    }, 500)
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