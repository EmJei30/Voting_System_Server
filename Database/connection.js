const mysql = require('mysql2')
const fs = require('fs');
require('dotenv').config();
const path = require('path');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
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