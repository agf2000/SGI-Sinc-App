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

const dbOrigin = eRequire('./dbOrigin');
const dbDest = eRequire('./dbDest');

let done = false;

NProgress.configure({
    minimum: 0.1,
    trickleSpeed: 2000
});

let destPath = os.tmpdir() + '\\tabelas';

$(function () {
    $(document).ready(function () {
        importData();

        // console.log(os.tmpdir());
        fse.mkdirsSync(destPath);
        // console.log(destPath);
        storage.setDataPath(destPath);

        // Click of the sinc button
        $('#btnGetAllProducts').click(function (e) {

            let $btn = this;
            $($btn).attr('disabled', true);

            let tableList = 'categoria,colecao,custoproduto,entrada,entradaitens,grades,grupo,gruposubgrupo,itens_grade,itens_grade_estoque,parametros_produto,produto,produtofornecedor,subgrupo,';
            // let tableList = 'categoria,colecao,produto,entrada,entradaitens,grupo,gruposubgrupo,';
            // let tableList = 'produto,';
            let tables = tableList.replace(/,\s*$/, "").split(',');

            let lineCount = 0,
                start = new Date(),
                starting;

            // $('#divTiming').append(`<li>Adquirindo dados...</li>`);

            let myVal = setInterval(function () {
                    if (done) {
                        clearInterval(myVal);
                    } else {
                        timerCount++;
                        if (dateDiff(starting.getTime()).minute >= 1) {
                            switch (dateDiff(starting.getTime()).minute) {
                                case 2:
                                    $('#divTiming').append(`<li>Importando milhares de dados. Aguarde...</li>`);
                                    break;
                                case 3:
                                    $('#divTiming').append(`<li>Importação ainda em andamento. Aguarde...</li>`);
                                    break;
                                default:
                                    $('#divTiming').append(`<li>Importação de dados em andamento. Aguarde...</li>`);
                                    break;
                            }

                        }
                    }
                }, 60000),
                timerCount = 1;

            // NProgress.start();

            let sqlGet = '';

            // Iterating thru the list of tables
            _.forEach(tables, function (item, index) {

                // switch (item) {
                //     case 'custoproduto':
                //     case 'entrada':
                //     case 'entradaitens':
                //     case 'produto':
                //         sqlGet += `with cteresults1 as (select *, row_number() over (order by codigo) as rownum1 from view_${item}_sinc) select * into #temp1 from cteresults1 where rownum1 between 1 and 9000; alter table #temp1 drop column rownum1; select * from #temp1; drop table #temp1; `;
                //         // sqlGet += `with cteresults2 as (select *, row_number() over (order by codigo) as rownum2 from view_${item}_sinc) select * into #temp2 from cteresults2 where rownum2 between 17001 and 34000; alter table #temp2 drop column rownum2; select * from #temp2; drop table #temp2; `;
                //         // sqlGet += `with cteresults3 as (select *, row_number() over (order by codigo) as rownum3 from view_${item}_sinc) select * into #temp3 from cteresults3 where rownum3 between 34001 and 51000; alter table #temp3 drop column rownum3; select * from #temp3; drop table #temp3; `;
                //         break;
                //     default:
                //         sqlGet += `select top 17000 * from view_${item}_sinc; `;
                //         break;
                // };

                sqlGet += `select * from view_${item}_sinc; `;
            });

            $('#divTiming').append(`<li>Conectando ao servidor de origem ${(new Date()).toLocaleTimeString()}.</li>`);

            sqlDb.connect(dbOrigin).then(pool => {
                $('#divTiming').append(`<li>Adiquirindo dados ${(new Date()).toLocaleTimeString()}.</li>`);

                NProgress.start();

                pool.request().query(sqlGet).then(data => {
                    console.log(moment(new Date()).format('HH:mm:ss'));
                    console.log(data);

                    starting = new Date();

                    // $('#divTiming').append(`<li>Tabela ${item} importada em (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})</li>`);
                    // starting = new Date();

                    let counter = data.rowsAffected.length;

                    _.forEach(tables, function (item, index) {
                        if (data.recordsets[index].length) {
                            storage.set(item, data.recordsets[index], function (error) {
                                if (error) throw error;

                                console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
                                starting = new Date();

                                counter = counter - 1;

                                if (counter == 0) {
                                    $('#divTiming').append(`<li>Dados adiquiridos em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
                                    done = true;
                                    NProgress.done();
                                    sqlDb.close();

                                    importData();
                                }
                            });

                            // _.forEach(data.recordsets[index].columns, function (column) {
                            //     console.log(column.name);
                            // });
                        } else {
                            counter = counter - 1;
                        }
                    });
                }).catch(err => {
                    console.log(err);
                    $('#divTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
                    clearInterval(myVal);
                    NProgress.done();
                    sqlDb.close();
                });
            });
        });
    });
});

function importData() {

    // const fs = require('fs');

    // fs.readdir(destPath, (err, files) => {
    //     files.forEach(file => {
    //         console.log(file);
    //     });
    // })

    let tableList = 'colecao,';
    let tables = tableList.replace(/,\s*$/, "").split(',');

    let counter = tables.length,
        lineCount = 0,
        start = new Date(),
        starting;

    let myVal = setInterval(function () {
            if (done) {
                clearInterval(myVal);
            } else {
                timerCount++;
                if (dateDiff(starting.getTime()).minute >= 1) {
                    switch (dateDiff(starting.getTime()).minute) {
                        case 2:
                            $('#divTiming').append(`<li>Importando milhares de dados. Aguarde...</li>`);
                            break;
                        case 3:
                            $('#divTiming').append(`<li>Importação ainda em andamento. Aguarde...</li>`);
                            break;
                        default:
                            $('#divTiming').append(`<li>Importação de dados em andamento. Aguarde...</li>`);
                            break;
                    }
                }
            }
        }, 60000),
        timerCount = 1;

    let fs = require('fs');

    // Iterating thru the list of tables
    _.forEach(tables, function (table, index) {

        let obj = JSON.parse(fs.readFileSync(`${destPath}\\colecao.json`, 'utf8'));
        // console.log(obj);

        let sqlInsert = '';

        _.forEach(obj, function (data) {
            sqlInsert += `set language portuguese; `
            sqlInsert += `declare @list_${table + index.toString()} varchar(max); `;
            sqlInsert += `set @list_${table + index.toString()} = `;

            let sqlSel = `'`;
            _.forEach(data, function (itens, i) {

                sqlSel += `select `;
                let sqlSelIn = '';
                _.forEach(data[i], function (value) {
                    if (value == null) {
                        sqlSelIn += `${null}, `;
                    } else if (value instanceof Date) {
                        sqlSelIn += `''${moment(value).format('DD/MM/YYYY HH:mm')}'', `;
                    } else if (isNaN(value)) {
                        value = value.replace(/'/g, "''''");
                        sqlSelIn += `''${value}'', `;
                    } else if (value == true) {
                        sqlSelIn += `1, `;
                    } else if (value == false) {
                        sqlSelIn += `0, `;
                    } else {
                        if (value.length > 10) {
                            sqlSelIn += `''${value}'', `;
                        } else {
                            sqlSelIn += `${value}, `;
                        }
                    }
                });
                sqlSel += sqlSelIn.replace(/,\s*$/, " ");

            });

            sqlInsert += `${sqlSel}';`;
            if (first)
                sqlInsert += `delete from ${table}; `;
            sqlInsert += `set identity_insert ${table} on; insert into ${table} (`;

            let columns = '';
            _.forEach(data.columns, function (column) {
                columns += `[${column.name}], `;
            });

            sqlInsert += `${columns.replace(/,\s*$/, "")}) exec(@list_${table + index.toString()}); set identity_insert ${table} off;`;
        });

        // sqlDb.connect(dbDest).then(pool => {
        //     if (error) throw error;

        //     pool.request().query(sqlInsert).then(result => {
        //         console.log(moment(new Date()).format('HH:mm:ss'));
        //         console.log(result);

        //         console.log(`${item} (${n(dateDiff(starting.getTime()).minute)}:${n(dateDiff(starting.getTime()).second)})`);
        //         starting = new Date();

        //         counter = counter - 1;

        //         if (counter == 0) {
        //             $('#divTiming').append(`<li>Dados importados em ${n(dateDiff(start.getTime()).minute)}:${n(dateDiff(start.getTime()).second)}.</li>`);
        //             done = true;
        //             NProgress.done();
        //             sqlDb.close();
        //         }
        //     }).catch(err => {
        //         console.log(err);
        //         $('#divTiming').append(`<li>Erro: ${err} as ${moment(new Date()).format('HH:mm:ss')}.</li>`);
        //         clearInterval(myVal);
        //         NProgress.done();
        //         sqlDb.close();
        //     });
        // });
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

function sqlScript(table, data, index, first) {

    let sqlInst = `set language portuguese; `
    sqlInst += `declare @list_${table + index.toString()} varchar(max); `;
    sqlInst += `set @list_${table + index.toString()} = `;

    let sqlSel = `'`;
    _.forEach(data, function (itens, i) {

        sqlSel += `select `;
        let sqlSelIn = '';
        _.forEach(data[i], function (value) {
            if (value == null) {
                sqlSelIn += `${null}, `;
            } else if (value instanceof Date) {
                sqlSelIn += `''${moment(value).format('DD/MM/YYYY HH:mm')}'', `;
            } else if (isNaN(value)) {
                value = value.replace(/'/g, "''''");
                sqlSelIn += `''${value}'', `;
            } else if (value == true) {
                sqlSelIn += `1, `;
            } else if (value == false) {
                sqlSelIn += `0, `;
            } else {
                if (value.length > 10) {
                    sqlSelIn += `''${value}'', `;
                } else {
                    sqlSelIn += `${value}, `;
                }
            }
        });
        sqlSel += sqlSelIn.replace(/,\s*$/, " ");

    });

    sqlInst += `${sqlSel}';`;
    if (first)
        sqlInst += `delete from ${table}; `;
    sqlInst += `set identity_insert ${table} on; insert into ${table} (`;

    let columns = '';
    _.forEach(data.columns, function (column) {
        columns += `[${column.name}], `;
    });

    sqlInst += `${columns.replace(/,\s*$/, "")}) exec(@list_${table + index.toString()}); set identity_insert ${table} off;`;

    return sqlInst;
};