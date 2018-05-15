// Setup the database from SQL files that hopefully are fully replayable

const { Client } = require('pg')
const fs = require("./fsasync.js");

Array.prototype.forEachAsync = async function (fn) {
    for (let t of this) { await fn(t) }
};

exports.initDb = async function (directory, dbConfig) {
    let entries = await fs.readdirAsync(directory);
    let filtered = entries.filter(entry => !entry.endsWith("~"));
    
    let client = new Client(dbConfig);
    await client.connect();

    await filtered.forEachAsync(async entry => {
        let file = await fs.readFileAsync(directory + "/" + entry);
        let statements = file.split("\n\n");
        let sqlToRun = statements.filter(statement => !statement.startsWith("--"));

        await sqlToRun.forEachAsync(async sql => {
            try {
                let res = await client.query(sql);
                // console.log(sql, res.rows);
            }
            catch (e) {
                console.log("error doing", sql, e);
            }
        });
    });
    return client;
};

async function init() {
    let client = await exports.initDb(__dirname + "/sql-people", {
        user: 'nichat',
        database: 'nichat',
        host: 'localhost',
        port: 5432
    });
    await client.end()
};

//init();

// end here
