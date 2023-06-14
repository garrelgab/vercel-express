const express = require('express')
const mysql = require('mysql');
const app = express()
const PORT = 4000

app.listen(PORT, () => {
  console.log(`API listening on PORT ${PORT} `)
})

app.get('/', (req, res) => {
  res.send('Hey this is my API running 🥳')
})

app.get('/about', (req, res) => {
  res.send('This is my about route..... ')
})


const connection = mysql.createPool({
  host: 'srv608.hstgr.io',
  user: 'u994941609_root', // this is the default username for XAMPP
  password: '8U5oGzb!B', // this is the default password for XAMPP
  database: 'u994941609_db_adamfitness', // replace with the name of your database
});


app.get("/members", (req, res) => {
  connection.query("select account_info_id, fname, lname, age, gender, DATE_FORMAT(bday, '%M %d, %Y') as bday, email, DATE_FORMAT(date_created, '%M %d, %Y') as date_created, status from tbl_account_info where role = 'customer'", (err, result) => {
    if(err){
      res.send({err: err})
    }
    else{
      res.send(result);
    }
  })
});




module.exports = connection

