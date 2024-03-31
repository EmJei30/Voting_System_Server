const mysql = require('mysql2')
const fs = require('fs');
require('dotenv').config();
const path = require('path');

const connection = mysql.createConnection({
    host: 'erp-voting.mysql.database.azure.com',
    user: 'erpadmin',
    password: 'P@$$w0rd@2024',
    database: 'election_system',
    port: '3306',
    ssl: {
      ca: fs.readFileSync(path.join(__dirname, 'DigiCertGlobalRootCA.crt.pem'))
    } 

    //     host: 'localhost',
    // user: 'root',
    // password: '123456',
    // database: 'election_system',
    // port: 3306,
})


module.exports = connection;