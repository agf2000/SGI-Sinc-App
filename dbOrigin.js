const os = eRequire('os');

let destPath = 'c:\\softer\\Sincronizador';

let dbOrigin = {};
let dbConfig = {};

function readOriginConfigFile() {
    fse.readFile(`${destPath}\\dbOrigin.json`, function (err, data) {
        if (err) {
            return console.log(err);
        }
        let fileRead = fse.readFileSync(`${destPath}\\dbOrigin.json`, 'utf8');
        dbOrigin = JSON.parse(fileRead);

        if (dbOrigin.port !== '1433')
            dbOrigin.server = dbOrigin.server + ':' + dbOrigin.port;

        // const mssql = require("mssql");
        dbConfig = {
            user: dbOrigin.user,
            password: dbOrigin.password,
            server: dbOrigin.server,
            database: dbOrigin.database,
            port: dbOrigin.port,
            connectionTimeout: 500000,
            requestTimeout: 500000,
            pool: {
                idleTimeoutMillis: 500000,
                max: 100
            }
        };

        // const pool = new mssql.ConnectionPool(dbConfig);
        // pool.on('error', err => {
        //     if (err) {
        //         console.log('sql errors', err);
        //     }
        //     if (!err) {
        //         pool.connect();
        //     }
        // });

        // const connection = new mssql.ConnectionPool(dbConfig, function (err) {
        //     if (err)
        //         throw err;
        // });
    });
};

readOriginConfigFile();

setInterval(function () {
    if (dbConfig.connectionTimeout) {

        module.exports = dbConfig;
    }

    readOriginConfigFile();
}, 1000);