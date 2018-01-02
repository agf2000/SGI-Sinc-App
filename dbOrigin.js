// const mssql = require("mssql");
const dbConfig = {
    user: "sa",
    password: "sa",
    // server: "servidorvia.winconnection.net\\sqlexpress",
    // database: "viapublica",
    server: "127.0.0.1\\sqlexpress",
    database: "viaorigem",
    port: 1433,
    connectionTimeout: 300000,
    requestTimeout: 300000,
    // pool: {
    //     idleTimeoutMillis: 300000,
    //     max: 100
    // }
};

// const connection = new mssql.ConnectionPool(dbConfig, function (err) {
//     if (err)
//         throw err;
// });

module.exports = dbConfig;