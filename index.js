const express = require('express')
const mysql = require('mysql');
const app = express()
const PORT = 4000
const bcrypt = require('bcrypt');

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
app.use(express.json());

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


app.post("/login", (req, res) => {
  const userEmail = req.body.userEmail;
  const userPassword = req.body.userPassword;
  connection.query(
    "SELECT * FROM tbl_accounts WHERE email = ? AND status = 'Active'",
    [userEmail],
    (err, result) => {
      if (err) {
        res.send({ err: "error po" });
      } else if (result.length > 0) {
        const hashedPassword = result[0].password;
        res.send({ message: hashedPassword });
        // bcrypt.compare(userPassword, hashedPassword, (err, isMatch) => {
        //   if (err) {
        //     res.send({ err: err });
        //   } else if (isMatch) {
        //     const accountId = result[0].account_id;
        //     connection.query(
        //       "SELECT fname FROM tbl_account_info WHERE account_info_id = ?",
        //       [accountId],
        //       (err, accountInfoResult) => {
        //         if (err) {
        //           res.send({ err: err });
        //         } else if (accountInfoResult.length > 0) {
        //           const firstName = accountInfoResult[0].fname;
        //           // Insert fname into tbl_attendance
        //           res.send(result);
        //         } else {
        //           res.send({ message: "Incorrect username/password." });
        //         }
        //       }
        //     );
        //   } else {
        //     res.send({ message: "Incorrect username/password." });
        //   }
        // });
      } else {
        res.send({ message: "Account not found or inactive." });
      }
    }
  );
});


module.exports = connection

