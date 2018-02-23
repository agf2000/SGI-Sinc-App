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

let dbOrigin = {};
let dbDest = {};

let stack_bottomright = {
    "dir1": "down",
    "dir2": "right",
    "push": "top"
};

fse.readFile(`${destPath}\\dbOrigin.json`, function (err, data) {
    if (err) {
        $('#btnBackup').removeClass('disabled');
        new PNotify({
            title: "Atenção",
            text: "Configurações incompletas.<br />Favor configrar os servidores.<br />Aperte o ALT para ter acesso ao menu.",
            type: 'warning',
            icon: false,
            addclass: "stack-bottomright",
            stack: stack_bottomright,
            delay: 6000
        });
        return console.log(err);
    }
    let fileRead = fse.readFileSync(`${destPath}\\dbOrigin.json`, 'utf8');
    dbOrigin = JSON.parse(fileRead);
});

fse.readFile(`${destPath}\\dbDest.json`, function (err, data) {
    if (err) {
        return console.log(err);
    }
    let fileRead = fse.readFileSync(`${destPath}\\dbDest.json`, 'utf8');
    dbDest = JSON.parse(fileRead);
});

let done = false;

const peopleFile = `${destPath}\\people_table.txt`,
    productsFile = `${destPath}\\products_table.txt`,
    itemsFile = `${destPath}\\items_table.txt`;

let peopleTableList = '',
    peopleTables = '',
    productsTableList = '',
    productsTables = '',
    itemsTableList = '',
    itemsTables = '';

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
        fse.writeFileSync(productsFile, 'categoria,colecao,custoproduto,entrada,entradaitens,grades,grupo,gruposubgrupo,itens_grade,itens_grade_estoque,parametros_produto,produto,produtofornecedor,subgrupo', 'utf-8');
        return console.log(err);
    }
    productsTableList = fse.readFileSync(productsFile, 'utf8');
    productsTables = productsTableList.replace(/,\s*$/, "").split(',');
});

fse.readFile(itemsFile, function (err, data) {
    if (err) {
        fse.writeFileSync(itemsFile, '', 'utf-8');
        return console.log(err);
    }
    itemsTableList = fse.readFileSync(itemsFile, 'utf8');
    itemsTables = peopleTableList.replace(/,\s*$/, "").split(',');
});

$(function () {

    $('#productsPasswordModal, #peoplePasswordModal, #itemsPasswordModal').modal();

    // console.log(os.tmpdir());
    fse.mkdirsSync(destPath);

    // console.log(destPath);
    storage.setDataPath(destPath);

    // Click of the sinc button
    $('#btnBackup').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;
        $($btn).attr('disabled', true);

        NProgress.configure({
            minimum: 0.1,
            trickleSpeed: 2000
        }).start();

        let bkupChron = new Date();

        $("#ulTiming").empty();
        $('#ulTiming').append(`<li>Fazendo cópia do banco de dados de destino ${bkupChron.toLocaleTimeString()}.</li>`);

        let bkupQuery = "backup database " + dbDest.database + " to disk = 'c:\\softer\\sgi\\copia\\" + dbDest.database + "_" + moment(new Date()).format('DD-MM-YYYY_HH-mm-ss') + ".bak' with format, medianame = '" + dbDest.database + "', name = 'full backup of " + dbDest.database + "';";
        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
            return pool.request().query(bkupQuery)
        }).then(result => {
            sqlDb.close();
            $('#ulTiming').append(`<li>Cópia do banco de dados realizada com sucesso em ${n(dateDiff(bkupChron.getTime()).minute)}:${n(dateDiff(bkupChron.getTime()).second)}.</li>`);
            $('#btnRepPeople').removeClass('disabled');
            $('#btnRepProducts').removeClass('disabled');
            NProgress.done();
        }).catch(err => {
            console.log(err);
            new PNotify({
                title: "Erro",
                text: err,
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright,
                delay: 6000
            });
            sqlDb.close();
        });
    });

    // Click of the sync products button
    $('#btnRepProducts').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        if ($('#passwd').val() == 'sftk123') {
            RepProducts($btn);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright,
                delay: 6000
            });
            $('#passwd').val(null);
        }
    });

    // Click of the sinc button
    $('#btnRepPeople').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let $btn = this;

        if ($('#passwd').val() == 'sftk123') {
            RepPeople($btn);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright,
                delay: 6000
            });
            $('#passwd').val(null);
        }
    });
});

function RepPeople($btn) {
    $($btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        trickleSpeed: 2000
    }).start();

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem ${(new Date()).toLocaleTimeString()}.</li>`);

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
            stack: stack_bottomright,
            delay: 6000
        });
        sqlDb.close();
    });
}

function RepProducts($btn) {
    $($btn).attr('disabled', true);

    NProgress.configure({
        minimum: 0.1,
        trickleSpeed: 2000
    }).start();

    $("#ulTiming").empty();
    $('#ulTiming').append(`<li>Conectando ao servidor de origem ${(new Date()).toLocaleTimeString()}.</li>`);

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
            stack: stack_bottomright,
            delay: 6000
        });
        sqlDb.close();
    });
}

function getProducts(btn) {

    let $btn = btn;

    let lineCount = 0,
        start = new Date(),
        starting = new Date();

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
        }, 60000),
        timerCount = 1;
    // NProgress.start();

    let sqlGet = '';

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (item, index) {
        // switch (item) {
        //     case 'custoproduto':
        //     case 'entrada':
        //     case 'entradaitens':
        //     case 'produto':
        //         sqlGet += `with cteresults1 as (select *, row_number() over (order by codigo) as rownum1 from view_${item}_sinc) select * into #temp1 from cteresults1 where rownum1 between 1 and 50000; alter table #temp1 drop column rownum1; select * from #temp1; drop table #temp1; `;
        //         // sqlGet += `with cteresults2 as (select *, row_number() over (order by codigo) as rownum2 from view_${item}_sinc) select * into #temp2 from cteresults2 where rownum2 between 17001 and 34000; alter table #temp2 drop column rownum2; select * from #temp2; drop table #temp2; `;
        //         // sqlGet += `with cteresults3 as (select *, row_number() over (order by codigo) as rownum3 from view_${item}_sinc) select * into #temp3 from cteresults3 where rownum3 between 34001 and 51000; alter table #temp3 drop column rownum3; select * from #temp3; drop table #temp3; `;
        //         break;
        //     default:
        //         sqlGet += `select top 17000 * from view_${item}_sinc; `;
        //         break;
        // };
        sqlGet += `select * from view_${item}_sinc; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo produtos ${moment(new Date()).format('HH:mm:ss')}.</li>`);

        // NProgress.start();

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
                                done = true;
                                NProgress.done();
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
                stack: stack_bottomright,
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
        starting = new Date();

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
            if (dateDiff(starting.getTime()).minute >= 1) {
                switch (dateDiff(starting.getTime()).minute) {
                    case 2:
                        $('#ulTiming').append(`<li>Importando milhares de dados. Aguarde...</li>`);
                        break;
                    case 3:
                        $('#ulTiming').append(`<li>Importação ainda em andamento. Aguarde...</li>`);
                        break;
                    default:
                        $('#ulTiming').append(`<li>Importação de dados em andamento. Aguarde...</li>`);
                        break;
                }
            }
        }
    }, 60000);

    let timerCount = 1;

    $('#ulTiming').append(`<li>Replicando <span id="liProduct">${productsTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of productsTables
    _.forEach(productsTables, function (table, index) {

        // let data = fse.readFileSync(`${destPath}\\${table}.json`, 'utf8');

        // let jsonData = chunks(JSON.parse(data), 3);

        // let obj = JSON.parse(fse.readFileSync(`${destPath}\\${table}.json`, 'utf8'));
        // console.log(obj);

        NProgress.configure({
            minimum: 0.1,
            trickleSpeed: 2000
        }).start();

        let sqlInst = ''; // `set language portuguese; waitfor delay \'00:00:05\'; `;

        // sqlInst += `exec sp_msforeachtable 'alter table ? disable trigger all'; `
        // sqlInst += `exec sp_desabilitar_chaves; `;
        // sqlInst += `exec sp_msforeachtable 'ALTER TABLE ? DISABLE TRIGGER all'; `;
        // sqlInst += `exec sp_desabilitar_chaves; `;
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
                                sqlSelIn += `''${value.toString().replace(/["']/g, "")}'', `;
                            } else if (value == true) {
                                sqlSelIn += `1, `;
                            } else if (value == false) {
                                sqlSelIn += `0, `;
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

                    sqlInst += `${sqlSel}'; insert into ${table} (`;

                    sqlInst += `${theColumns.replace(/['"]+/g, '')}) exec(@list_${table + '_' + index.toString()}); `;
                });

                sqlInst += `if ((select objectproperty(object_id('${table}'), 'TableHasIdentity')) = 1)`;
                sqlInst += `set identity_insert ${table} off; `;
                // sqlInst += `alter table ${table} nocheck constraint all; `;
                // sqlInst += `alter table ${table} enable trigger all; `;
                // sqlInst += `exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; `;
                // sqlInst += `exec sp_habilitar_chaves; `;

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
                                        addclass: "stack-bottomright",
                                        stack: stack_bottomright,
                                        delay: 6000
                                    });
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright",
                                        stack: stack_bottomright,
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
                                    addclass: "stack-bottomright",
                                    stack: stack_bottomright,
                                    delay: 6000
                                });
                                sqlDb.close();
                            }).catch(err => {
                                console.log(err);
                                new PNotify({
                                    title: "Erro",
                                    text: err,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright",
                                    stack: stack_bottomright,
                                    delay: 6000
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

function getPeople(btn) {

    let $btn = btn;
    $($btn).attr('disabled', true);

    let lineCount = 0,
        start = new Date(),
        starting = new Date();

    let myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                timerCount++;
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 2:
                            $('#ulTiming').append(`<li>Adiquerindo milhares de dados. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#ulTiming').append(`<li>Transferência ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#ulTiming').append(`<li>Adiquerindo pessoas em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000),
        timerCount = 1;

    let sqlGet = '';

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (item, index) {
        sqlGet += `select * from view_${item}_sinc; `;
    });

    new sqlDb.ConnectionPool(dbOrigin).connect().then(pool => {
        $('#ulTiming').append(`<li>Adiquirindo dados ${moment(new Date()).format('HH:mm:ss')}.</li>`);
        // NProgress.configure({
        //     minimum: 0.1,
        //     trickleSpeed: 2000
        // }).start();

        pool.request().query(sqlGet).then(data => {
            // console.log(moment(new Date()).format('HH:mm:ss'));

            starting = new Date();

            let counter = peopleTables.length;
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
                                done = true;
                                NProgress.done();
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
            NProgress.done();
            new PNotify({
                title: "Erro",
                text: err,
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                stack: stack_bottomright,
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
        starting = new Date();

    let myVal = setInterval(function () {
        if (done) {
            clearInterval(myVal);
        } else {
            timerCount++;
            if (dateDiff(starting.getTime()).minute >= 1) {
                switch (dateDiff(starting.getTime()).minute) {
                    case 2:
                        $('#ulTiming').append(`<li>Importando milhares de dados. Aguarde...</li>`);
                        break;
                    case 3:
                        $('#ulTiming').append(`<li>Importação ainda em andamento. Aguarde...</li>`);
                        break;
                    default:
                        $('#ulTiming').append(`<li>Importação de dados em andamento. Aguarde...</li>`);
                        break;
                }
            }
        }
    }, 60000);

    let timerCount = 1;

    $('#ulTiming').append(`<li>Replicando <span id="liPeople">${peopleTables.length}</span> tabelas ${moment(new Date()).format('HH:mm:ss')}`);

    // Iterating thru the list of peopleTables
    _.forEach(peopleTables, function (table, index) {

        NProgress.configure({
            minimum: 0.1,
            trickleSpeed: 2000
        }).start();

        let sqlInst = '';
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

                // adding to sql database
                new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                    pool.request().query(sqlInst).then(result => {
                        // console.log(moment(new Date()).format('HH:mm:ss'));
                        // console.log(result);

                        // $('#ulTiming').append(`<li>${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        console.log(`${table} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                        starting = new Date();

                        counter = counter - 1;

                        $('#liPeople').html(counter);

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
                                        addclass: "stack-bottomright",
                                        stack: stack_bottomright,
                                        delay: 6000
                                    });
                                    NProgress.done();
                                }).catch(err => {
                                    console.log(err);
                                    new PNotify({
                                        title: "Erro",
                                        text: err,
                                        type: 'error',
                                        icon: false,
                                        addclass: "stack-bottomright",
                                        stack: stack_bottomright,
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
                        NProgress.done();
                        sqlDb.close();

                        new sqlDb.ConnectionPool(dbDest).connect().then(pool => {
                            pool.request().query("exec sp_msforeachtable 'ALTER TABLE ? ENABLE TRIGGER all'; exec sp_habilitar_chaves;").then(result => {
                                console.log(result);
                                $('#ulTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                                sqlDb.close();
                                new PNotify({
                                    title: "Erro",
                                    text: result,
                                    type: 'error',
                                    icon: false,
                                    addclass: "stack-bottomright",
                                    stack: stack_bottomright,
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
                                    stack: stack_bottomright,
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
                            stack: stack_bottomright,
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

function dateDiff(timestamp) {
    var d = Math.abs(timestamp - new Date().getTime()) / 1000; // delta
    var r = {}; // result
    var s = { // structure
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