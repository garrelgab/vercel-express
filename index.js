// const express = require('express')

// const app = express()
// const PORT = 4000

// app.listen(PORT, () => {
//   console.log(`API listening on PORT ${PORT} `)
// })

// app.get('/', (req, res) => {
//   res.send('Hey this is my API running 🥳')
// })

// app.get('/about', (req, res) => {
//   res.send('This is my about route..... ')
// })


// module.exports = app

const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const qrcode = require('qrcode');
const moment = require('moment');
const path = require('path');
const app = express();
const bcrypt = require('bcrypt');
const port = process.env.PORT || 5050;
const apiUrl = process.env.PUBLIC_URL;
const mysql = require('mysql');

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root', // this is the default username for XAMPP
//   password: '', // this is the default password for XAMPP
//   database: 'db_adamfitness', // replace with the name of your database
// });
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'u994941609_root', // this is the default username for XAMPP
//   password: 'Password1', // this is the default password for XAMPP
//   database: 'u994941609_db_adamfitness', // replace with the name of your database
// });
const connection = mysql.createPool({
  host: 'srv608.hstgr.io',
  user: 'u994941609_root', // this is the default username for XAMPP
  password: '8U5oGzb!B', // this is the default password for XAMPP
  database: 'u994941609_db_adamfitness', // replace with the name of your database
});

// connection.connect(function(err) {
//   if (err) {
//     console.error('Error connecting to MySQL database:', err);
//     return;
//   }
//   console.log('Connected to MySQL database!');
// });

app.use(express.json());

app.use(cors({
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}))

app.get('/', (req, res)=>{
  res.send(`Server running on Port: ${port}`);
});

app.get('/test', (req, res) => {
  res.send('Test Route');
});

app.post("/logins", (req, res) => {
  const userEmail = req.body.userEmail;
  const userPassword = req.body.userPassword;
  connection.query(
    "SELECT * FROM tbl_accounts WHERE email = ? AND status = 'Active'",
    [userEmail],
    (err, result) => {
      if (err) {
        res.send({ err: err });
      } else if (result.length > 0) {
        const hashedPassword = result[0].password;
        bcrypt.compare(userPassword, hashedPassword, (err, isMatch) => {
          if (err) {
            res.send({ err: err });
          } else if (isMatch) {
            const accountId = result[0].account_id;
            connection.query(
              "SELECT fname FROM tbl_account_info WHERE account_info_id = ?",
              [accountId],
              (err, accountInfoResult) => {
                if (err) {
                  res.send({ err: err });
                } else if (accountInfoResult.length > 0) {
                  const firstName = accountInfoResult[0].fname;
                  // Insert fname into tbl_attendance
                  res.send(result);
                } else {
                  res.send({ message: "Incorrect username/password." });
                }
              }
            );
          } else {
            res.send({ message: "Incorrect username/password." });
          }
        });
      } else {
        res.send({ message: "Account not found or inactive." });
      }
    }
  );
});


app.post("/insert", (req, res) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);
  const userFname = req.body.userFname;
  const userLname = req.body.userLname;
  const userAge = req.body.userAge;
  const userGender = req.body.userGender;
  const userBday = req.body.userBday;
  const userEmail = req.body.userEmail;
  const userPword = req.body.userPword;
  const userCPword = req.body.userCPword;
  let userRole = req.body.userRole; // Default role
  let isFirstAdmin = false; // Flag to track if it's the first admin creation

  // Check if there is an existing admin role
  connection.query("SELECT * FROM tbl_accounts WHERE role = 'admin'", (err, adminResult) => {
    if (err) {
      console.log('Failed to check existing admin role', err);
      res.sendStatus(500);
      return;
    }

    if (adminResult.length === 0) {
      // No existing admin role found, set the role as admin
      userRole = 'admin';
      isFirstAdmin = true;
    }

    // Hash the passwords
    bcrypt.hash(userPword, 10, (err, hashUserPword) => {
      if (err) {
        console.log('Error hashing password', err);
        res.sendStatus(500);
        return;
      }
      bcrypt.hash(userCPword, 10, (err, hashConfirmPword) => {
        if (err) {
          console.log('Error hashing confirm password', err);
          res.sendStatus(500);
          return;
        }
        const checkEmailQuery = 'SELECT * FROM tbl_account_info WHERE email = ?';
        connection.query(checkEmailQuery, [userEmail], (err, results) => {
          if (err) {
            console.log('Failed to query email', err);
            res.sendStatus(500);
          } else if (results.length > 0) {
            // Email already exists
            res.status(400).json({ error: 'Email already exists' });
          } else {
            // Email does not exist, proceed with insertion
            const sqlInsert = `INSERT INTO tbl_account_info (fname, lname, age, gender, bday, email, pword, cpword, role, date_created, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '${currentDate}', 'Active')`;
            connection.query(
              sqlInsert,
              [userFname, userLname, userAge, userGender, userBday, userEmail, hashUserPword, hashConfirmPword, userRole],
              (err, result) => {
                if (err) {
                  console.log('Failed to add account info', err);
                  res.sendStatus(500);
                } else {
                  const accountId = result.insertId;
                  console.log('Last Inserted Account ID:', accountId);
                  const sqlAccount = `INSERT INTO tbl_accounts (email, password, role, status) VALUES (?, ?, ?, 'Active')`;
                  connection.query(sqlAccount, [userEmail, hashUserPword, userRole], (err, result) => {
                    if (err) {
                      console.log('Failed to add account', err);
                      res.sendStatus(500);
                    } else {
                      const sqlHealth = `INSERT INTO tbl_health_conditions (diabetes, chest_pains, broken_bones, heart_murmur, epilepsy, oedema, recentsurgery, highblood, asthma, fainting, heartdisease, shortofbreath, allergies, pneumonia, tachycardia, heartattack, palpitate, lowblood, seizure, other, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                      connection.query(
                        sqlHealth,
                        [
                          req.body.diabetes,
                          req.body.chest,
                          req.body.bones,
                          req.body.heartmur,
                          req.body.epilepsy,
                          req.body.oedema,
                          req.body.recent,
                          req.body.highblood,
                          req.body.asthma,
                          req.body.fainting,
                          req.body.heartdisease,
                          req.body.shortbreath,
                          req.body.allergies,
                          req.body.pneumonia,
                          req.body.tachy,
                          req.body.heartattack,
                          req.body.palpitation,
                          req.body.lowblood,
                          req.body.seizure,
                          req.body.other,
                          accountId,
                        ],
                        (err, result) => {
                          if (err) {
                            console.log('Failed to add health conditions', err);
                            res.sendStatus(500);
                          } else {
                            if (isFirstAdmin) {
                              const sqlModules = `INSERT INTO tbl_modules (account_info_id, dashboard, reservation, window_payment, sales_report, settings, user_account, audit_trail, attendance_log, health_guide, announcement) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                              const modulesValues = [accountId, true, true, true, true, true, true, true, true, true, true];
                              connection.query(sqlModules, modulesValues, (err, result) => {
                                if (err) {
                                  console.log('Failed to insert modules for admin', err);
                                } else {
                                  console.log('Modules inserted for admin');
                                }
                              });
                              res.sendStatus(201); // First admin created
                            } else {
                              const newMember = `New Member Account: ${userFname} ${userLname}`;
                              const insertAudit = `insert into tbl_audit (action, date, time) values (?, ?, ?)`
                              connection.query(insertAudit, [newMember, currentDate, currentTime], (err, newMemberResult) => {
                                if (err) {
                                  console.log('Failed to add new member', err);
                                } else {
                                  res.sendStatus(200);
                                }
                              })
                              // res.sendStatus(200); // Regular account created
                            }
                          }
                        }
                      );
                    }
                  });
                }
              }
            );
          }
        });
      });
    });
  });
});


// app.post("/login", (req, res) => {
//   const userEmail = req.body.userEmail;
//   const userPword = req.body.userPword;
//   connection.query(
//     "SELECT * FROM tbl_accounts WHERE email = ? AND password = ? AND status = 'Active'",
//     [userEmail, userPword],
//     (err, result) => {
//       if (err) 
//       {
//         res.send({ err: err });
//       } 
//       else if (result.length > 0) 
//       {
//         const accountId = result[0].account_id;
//         connection.query(
//           "SELECT fname FROM tbl_account_info WHERE account_info_id = ?",
//           [accountId],
//           (err, accountInfoResult) => {
//             if (err) {
//               res.send({ err: err });
//             } else if (accountInfoResult.length > 0) {
//               const firstName = accountInfoResult[0].fname;

//               // Insert fname into tbl_attendance
//               const currentDate = new Date().toISOString().slice(0, 10);
//               const currentTime = new Date().toTimeString().slice(0, 8);
//               connection.query(
//                 `INSERT INTO tbl_attendance (fname, status, time_in, time_out, date) VALUES (?, 'Active', '${currentTime}', '', '${currentDate}')`,
//                 [firstName],
//                 (err, insertionResult) => {
//                   if (err) {
//                     res.send({ err: err });
//                   } else {
//                     const role = result[0].role;
//                     res.send({ message: "Attendance record inserted successfully.", role: role});
//                     res.send(result);
//                   }
//                 }
//               );
//             } else {
//               res.send({ message: "Incorrect username/password." });
//             }
//           }
//         );
//       }
//       else 
//       {
//         res.send({ message: "Account info not found." });
//       }
//     }
//   );
// });

// app.post("/login", (req, res) => {
//   const userEmail = req.body.userEmail;
//   const userPword = req.body.userPword;
//   connection.query(
//     "SELECT * FROM tbl_accounts WHERE email = ? AND password = ? AND status = 'Active'",
//     [userEmail, userPword],
//     (err, result) => {
//       if (err) {
//         res.send({ err: err });
//       } else if (result.length > 0) {
//         const accountId = result[0].account_id;
//         connection.query(
//           "SELECT fname FROM tbl_account_info WHERE account_info_id = ?",
//           [accountId],
//           (err, accountInfoResult) => {
//             if (err) {
//               res.send({ err: err });
//             } else if (accountInfoResult.length > 0) {
//               const firstName = accountInfoResult[0].fname;
//               // Insert fname into tbl_attendance
//               const currentDate = new Date().toISOString().slice(0, 10);
//               const currentTime = new Date().toTimeString().slice(0, 8);
//               connection.query(
//                 `INSERT INTO tbl_attendance (name, status, time_in, date) VALUES (?, 'Active', ?, ?)`,
//                 [firstName, currentTime, currentDate],
//                 (err, insertionResult) => {
//                   if (err) {
//                     res.send({ err: err });
//                   } else {
//                     const role = result[0].role; // Retrieve the role from tbl_accounts
//                     // res.send({ message: "Attendance record inserted successfully.", account_id: accountId, role: role });
//                     // res.send({ message: "Attendance record inserted successfully.", insertionResult });
//                     res.send(result);
//                   }
//                 }
//               );
//             } else {
//               res.send({ message: "Incorrect username/password." });
//             }
//           }
//         );
//       } else {
//         res.send({ message: "Account info not found." });
//       }
//     }
//   );
// });


app.get('/account-name', (req, res) => {
  const accID = req.query.accID;
  const accName = `select fname, lname from tbl_account_info where account_info_id = ?`;
  connection.query(accName, [accID], (err, result) => {
    if(err){
      console.log('Failed to get account name', err);
    }else{
      res.send(result);
    }
  });
});


app.get("/members", (req, res) => {
  // const members = "select * from tbl_account_info where role = 'customer'";
  connection.query("select account_info_id, fname, lname, age, gender, DATE_FORMAT(bday, '%M %d, %Y') as bday, email, DATE_FORMAT(date_created, '%M %d, %Y') as date_created, status from tbl_account_info where role = 'customer'", (err, result) => {
    if(err){
      res.send({err: err})
    }
    else{
      res.send(result);
    }
  })
});

// app.get("/login", (req, res) => {
//   if(req.session.user) {
//     res.send({loggedIn: true, user: req.session.user})
//   }
//   else{
//     res.send({loggedIn: false})
//   }
// });



// app.post("/reservation", (req, res) => {
//   const customerName = req.body.customerName;
//   const customerStartTime = req.body.customerStartTime;
//   const customerEndTime = req.body.customerEndTime;
//   const customerDate = req.body.customerDate;
//   const customerStatus = req.body.customerStatus;
//   const customerID = req.body.customerID;

//   const getCustomerName = `select fname from tbl_account_info where account_info_id = '${customerID}'`;
//   connection.query(getCustomerName, (err, results) => {

//   })
//   const sqlInsert = "insert into tbl_reservation (name, time_start, time_end, customer_date, status) values (?, ?, ?, STR_TO_DATE(?, '%m-%d-%Y'), ?)";
//   connection.query(sqlInsert, [customerName, customerStartTime, customerEndTime, customerDate, customerStatus], (err, result) => {
//     res.send(result);
//   });
// });

// app.post("/reservation", (req, res) => {
//   const customerName = req.body.customerName;
//   const customerStartTime = req.body.customerStartTime;
//   const customerEndTime = req.body.customerEndTime;
//   const customerDate = req.body.customerDate;
//   const customerStatus = req.body.customerStatus;
//   const noPax = req.body.noPax;
//   const customerID = req.body.customerID;
//   const lastProofID = req.body.lastProofID
//   const getCustomerName = `SELECT fname FROM tbl_account_info WHERE account_info_id = '${customerID}'`;
//   connection.query(getCustomerName, (err, results) => {
//     if (err) {
//       console.log("Error fetching customer name:", err);
//       res.status(500).json({ error: "Failed to fetch customer name" });
//     } else {
//       const fname = results[0].fname; // Assuming the query returns a single row

//       const sqlInsert = "INSERT INTO tbl_reservation (name, pax, time_start, time_end, customer_date, status, proof_of_payment_id) VALUES (?, ?, ?, ?, STR_TO_DATE(?, '%m-%d-%Y'), ?, ?)";
//       connection.query(sqlInsert, [fname, noPax, customerStartTime, customerEndTime, customerDate, customerStatus, lastProofID], (err, result) => {
//         if (err) {
//           console.log("Error inserting reservation:", err);
//           res.status(500).json({ error: "Failed to insert reservation" });
//         } else {
//           res.send(result);
//         }
//       });
//     }
//   });
// });

app.post("/reservation", (req, res) => {
  const customerName = req.body.customerName;
  const customerStartTime = req.body.customerStartTime;
  const customerEndTime = req.body.customerEndTime;
  const customerDate = req.body.customerDate;
  const customerStatus = req.body.customerStatus;
  const noPax = req.body.noPax;
  const customerID = req.body.customerID;
  const lastProofID = req.body.lastProofID;


  const refNum = req.body.refNum;
  const amount = req.body.amount;
  const imageData = req.body.imageData;
  const desc = req.body.desc;
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');


  // Check if there is already a booking for the given customer_date
  const checkBookingQuery = "SELECT * FROM tbl_reservation WHERE customer_date = STR_TO_DATE(?, '%m-%d-%Y') and account_info_id = ?";
  connection.query(checkBookingQuery, [customerDate, customerID], (err, CheckResults) => {
    if (err) {
      console.log("Error checking booking:", err);
      res.status(500).json({ error: "Failed to check booking" });
    } else {
      if (CheckResults.length > 0) {
        // A booking already exists for the given customer_date
        res.status(400).json({ error: "Booking already exists for the specified date" });
      } else {
        // No existing booking for the given customer_date, proceed with the reservation
        const totalPaxQuery = "SELECT SUM(pax) AS total_pax FROM tbl_reservation WHERE customer_date = STR_TO_DATE(?, '%m-%d-%Y') AND time_start = ? AND time_end = ?";
        connection.query(totalPaxQuery, [customerDate, customerStartTime, customerEndTime], (err, paxResult) => {
          if (err) {
            console.log("Error calculating total pax:", err);
            res.status(500).json({ error: "Failed to calculate total pax" });
          } else {
            const totalPax = paxResult[0].total_pax || 0; // Default to 0 if no rows returned

            // Validate if the total pax exceeds 15 for the session
            if (totalPax + parseInt(noPax) > 15) {
              res.status(200).json({ error: `The session ${customerStartTime}-${customerEndTime} is full`, totalPax });
            }
            // else if (totalPax + parseInt(noPax) < 15) {
            //   res.status(300).json({ error: `${totalPax} is already in this session.`, totalPax });
            // }
            else {
              // Proceed with the reservation
              const getCustomerName = "SELECT fname, email FROM tbl_account_info WHERE account_info_id = ?";
              connection.query(getCustomerName, [customerID], (err, results) => {
                if (err) {
                  console.log("Error fetching customer name:", err);
                  res.status(500).json({ error: "Failed to fetch customer name" });
                } else {
                  const fname = results[0].fname; // Assuming the query returns a single row
                  const email = results[0].email;

                  // Insert the proof of payment
                  const addProof = `INSERT INTO tbl_proof_of_payment (account_info_id, email, name, description, reference_number, amount, image, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;
                  connection.query(
                    addProof,
                    [customerID, email, fname, desc, refNum, amount, buffer, currentDate, currentTime],
                    (err, proofResult) => {
                      if (err) {
                        console.log('Failed to insert proof of payment', err);
                        res.status(500).send('Failed to insert proof of payment');
                      } else {
                        const insertedId = proofResult.insertId;
                        // Insert the reservation into the database
                        const sqlInsert = "INSERT INTO tbl_reservation (name, account_info_id, pax, time_start, time_end, customer_date, status, proof_of_payment_id) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%m-%d-%Y'), ?, ?)";
                        connection.query(sqlInsert, [fname, customerID, noPax, customerStartTime, customerEndTime, customerDate, customerStatus, insertedId], (err, result) => {
                          if (err) {
                            console.log("Error inserting reservation:", err);
                            res.status(500).json({ error: "Failed to insert reservation" });
                          } else {
                            res.send({totalPax, insertedId});
                          }
                        });
                      }
                    }
                  );
                }
              });
            }
          }
        });
      }
    }
  });
});


app.get("/events", (req, res) => {
  const fetchEvents = "select reservation_id, name, status, DATE_FORMAT(customer_date, '%M %d, %Y') as start, TIME_FORMAT(time_start, '%h:%i %p') as time_start_formatted, TIME_FORMAT(time_end, '%h:%i %p') as time_end_formatted, pax from tbl_reservation";
  connection.query(fetchEvents, (err, result) => {
    if(err){
      console.log("Error fetching events:", err);
      res.send(err)
    }
    else{
      const events = result.map((event) => ({
        id: event.reservation_id,
        title: `${event.name} - ${event.pax} Pax - ${event.status}`,
        start: `${event.start} ${event.time_start_formatted}`,
        end: `${event.start} ${event.time_end_formatted}`,
        status: `${event.status}`,
        backgroundColor: event.status === 'Pending' ? 'red' : 'green'
      }));
      res.json(events);
    }
  });
});

app.get("/events-reservation", (req, res) => {
  const fetchEvents = "select reservation_id, name, status, DATE_FORMAT(customer_date, '%M %d, %Y') as start, TIME_FORMAT(time_start, '%h:%i %p') as time_start_formatted, TIME_FORMAT(time_end, '%h:%i %p') as time_end_formatted, pax from tbl_reservation where status IN ('Approved', 'Pending')";
  connection.query(fetchEvents, (err, result) => {
    if(err){
      console.log("Error fetching events:", err);
      res.send(err)
    }
    else{
      const events = result.map((event) => ({
        id: event.reservation_id,
        title: `${event.name} - ${event.pax} Pax - ${event.status}`,
        start: `${event.start} ${event.time_start_formatted}`,
        end: `${event.start} ${event.time_end_formatted}`,
        status: `${event.status}`,
        backgroundColor: event.status === 'Pending' ? 'red' : 'green'
      }));
      res.json(events);
    }
  });
});


app.get("/events/approved", (req, res) => {
  const fetchEvents = "select reservation_id, name, status, DATE_FORMAT(customer_date, '%M %d, %Y') as start, TIME_FORMAT(time_start, '%h:%i %p') as time_start_formatted, TIME_FORMAT(time_end, '%h:%i %p') as time_end_formatted, pax from tbl_reservation where status = 'Approved'";
  connection.query(fetchEvents, (err, result) => {
    if(err){
      console.log("Error fetching events:", err);
      res.send(err)
    }
    else{
      const events = result.map((event) => ({
        id: event.reservation_id,
        title: `${event.pax} Pax - ${event.status}`,
        start: `${event.start} ${event.time_start_formatted}`,
        end: `${event.start} ${event.time_end_formatted}`,
      }));
      res.json(events);
    }
  });
});

app.get("/events/pending", (req, res) => {
  const fetchEvents = "select reservation_id, name, status, DATE_FORMAT(customer_date, '%M %d, %Y') as start, TIME_FORMAT(time_start, '%h:%i %p') as time_start_formatted, TIME_FORMAT(time_end, '%h:%i %p') as time_end_formatted from tbl_reservation where status = 'Pending'";
  connection.query(fetchEvents, (err, result) => {
    if(err){
      console.log("Error fetching events:", err);
      res.send(err)
    }
    else{
      const events = result.map((event) => ({
        id: event.reservation_id,
        title: `${event.name} - ${event.status}`,
        start: `${event.start} ${event.time_start_formatted}`,
        end: `${event.start} ${event.time_end_formatted}`,
        
      }));
      res.json(events);
    }
  });
});

app.put('/approved', (req, res) => {
  const reservationID = req.body.id;
  const reservationStatus = req.body.status;
  const approvedReservation = "update tbl_reservation set status = ? where reservation_id = ?";
  connection.query(approvedReservation, [reservationStatus, reservationID], (err, result) => {
    if (err) {
      console.log("Error updating event:", err);
    } else {
      res.send("Event updated successfully");
    }
  });
});

app.put('/hold', (req, res) => {
  const proofID = req.body.proofID;
  const reservationStatus = req.body.reservationStatus;
  const accID = req.body.accID;
  const accName = req.body.accName;
  const amount = req.body.amount;
  const referenceNumber = req.body.referenceNumber;
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);

  const confirm = `update tbl_proof_of_payment set status = 'Confirmed' where proof_of_payment_id = ?`;
  connection.query(confirm, [proofID], (err, result) => {
    if (err) {
      console.log(err);
    } else {
      const approvedReservation = "update tbl_reservation set status = ? where proof_of_payment_id = ?";
      connection.query(approvedReservation, [reservationStatus, proofID], (err, ReservationResult) => {
        if (err) {
          console.log("Error updating event:", err);
        } else {
          const getAccountInfo = `SELECT * FROM tbl_account_info WHERE account_info_id = ?`;
          connection.query(getAccountInfo, [accID], (err, accountInfoResult) => {
            if (err) {
              console.log('Failed to get account info', err);
              res.sendStatus(500);
              return;
            } else {
              const insertNotification = `INSERT INTO tbl_notification (account_info_id, description, date, time, status) VALUES (?, ?, ?, ?, 'Unread')`;
              connection.query(insertNotification, [accID, `${accName}, Your payment has been confirmed. Ref No. ${referenceNumber}`, currentDate, currentTime], (err, notificationResult) => {
                if (err) {
                  console.log('Failed to insert notification', err);
                  res.sendStatus(500);
                  return;
                }
                // res.sendStatus(200);
                const payment = `Reference Number: ${referenceNumber}`;
                const insertSales = `insert into tbl_sales_report (description, total, date, time, category) values ('${payment}', '${amount}', '${currentDate}', '${currentTime}', 'Reservation')`;
                connection.query(insertSales, (err, salesResult) => {
                  if(err){
                    console.log('Failed to add sales', err);
                  } else {
                    res.sendStatus(200);
                  }
                });
              });
              // res.send("Event updated successfully");
            }
          });
        }
      });
    }
  })
});


app.get('/members-count', (req, res) => {
  const countMembers = "select count(account_info_id) as count from tbl_account_info where role = 'customer'";
  connection.query(countMembers, (err, result) => {
    if(err){
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.get('/approved-count', (req, res) => {
  const countPending = "select count(reservation_id) as count from tbl_reservation where status = 'Approved'";
  connection.query(countPending, (err, result) => {
    if(err){
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.get('/pending-count', (req, res) => {
  const countPending = "select count(reservation_id) as count from tbl_reservation where status = 'Pending'";
  connection.query(countPending, (err, result) => {
    if(err){
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.get('/event-count', (req, res) => {
  const countEvent = "select count(reservation_id) as count from tbl_reservation";
  connection.query(countEvent, (err, result) => {
    if(err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.put('/customer-info', (req, res) => {
  const customerFname = req.body.customerFname;
  const customerLname = req.body.customerLname;
  const customerID = req.body.customerID;
  const customerEmail = req.body.customerEmail;
  const updateInfo = "update tbl_account_info set fname = ?, lname = ?, email = ? where account_info_id = ?";
  connection.query(updateInfo, [customerFname, customerLname, customerEmail, customerID], (err, result) => {
    if (err) {
      console.log("Error updating personal information:", err);
    } else {
      const updateAcc = `update tbl_accounts set email = ? where account_id = ?`;
      connection.query(updateAcc, [customerEmail, customerID], (err, results) => {
        if (err) {
          console.log(err);
        } else {
          res.send(results);
        }        
      });
    }
  });
});

app.get('/get-info', (req, res) => {
  const customerID = req.query.customerID;
  const getCustomerInfo = "select fname, lname, gender, DATE_FORMAT(bday, '%M %d, %Y') as bday, age, email from tbl_account_info where account_info_id = ?";
  connection.query(getCustomerInfo, [customerID], (err, result) => {
    if (err) {
      console.log("Error fetching personal information:", err);
    } else {
      res.send(result);
    }
  })
});

// app.put('/customer-pass', (req, res) => {
//   const customerPword = req.body.customerPword;
//   const customerCPword = req.body.customerCPword;
//   const customerID = req.body.customerID;
//   const updatePass = "update tbl_account_info set pword = ?, cpword = ? where account_info_id = ?";
//   connection.query(updatePass, [customerPword, customerCPword, customerID], (err, result) => {
//     if (err) {
//       console.log("Error updating password:", err);
//     } else {
//       res.send(result);
//       console.log(customerID);
//     }
//   });
// });

// app.put('/customer-pass', (req, res) => {
//   const customerID = req.body.customerID;
//   const currentPword = req.body.currentPword;
//   const newPword = req.body.newPword;
//   const confirmPword = req.body.confirmPword;
//   // First, check if the current password matches the one in the database
//   const checkCurrentPwordQuery = "SELECT * FROM tbl_account_info WHERE account_info_id = ? AND pword = ?";
//   connection.query(checkCurrentPwordQuery, [customerID, currentPword], (err, rows) => {
//     if (err) {
//       console.log("Error checking current password:", err);
//       res.sendStatus(500);
//       return;
//     }

//     if (rows.length === 0) {
//       // Current password is incorrect
//       res.status(400).json({ message: "Current password is incorrect" });
//       return;
//     }

//     // Current password is correct, proceed with updating the password
//     const updatePassQuery = "UPDATE tbl_account_info SET pword = ?, cpword = ? WHERE account_info_id = ?";
//     connection.query(updatePassQuery, [newPword, confirmPword, customerID], (err, result) => {
//       if (err) {
//         console.log("Error updating password:", err);
//         res.sendStatus(500);
//         return;
//       }
//       res.sendStatus(200);
//     });
//   });
// });

app.put('/customer-pass', (req, res) => {
  const customerID = req.body.customerID;
  const currentPword = req.body.currentPword;
  const newPword = req.body.newPword;
  const confirmPword = req.body.confirmPword;

  // First, check if the current password matches the one in the database
  const checkCurrentPwordQuery = "SELECT * FROM tbl_account_info WHERE account_info_id = ?";
  connection.query(checkCurrentPwordQuery, [customerID], (err, rows) => {
    if (err) {
      console.log("Error checking current password:", err);
      res.sendStatus(500);
      return;
    }

    if (rows.length === 0) {
      // Account not found
      res.status(400).json({ message: "Account not found" });
      return;
    }

    // Compare the current password with the stored hashed password
    const hashedCurrentPword = rows[0].pword;
    bcrypt.compare(currentPword, hashedCurrentPword, (err, isMatch) => {
      if (err) {
        console.log("Error comparing passwords:", err);
        res.sendStatus(500);
        return;
      }

      if (!isMatch) {
        // Current password is incorrect
        res.status(400).json({ message: "Current password is incorrect" });
        return;
      }

      // Current password is correct, proceed with updating the password
      bcrypt.hash(newPword, 10, (err, hashNewPword) => {
        if (err) {
          console.log("Error hashing new password:", err);
          res.sendStatus(500);
          return;
        }

        bcrypt.hash(confirmPword, 10, (err, hashConfirmPword) => {
          if (err) {
            console.log("Error hashing confirm password:", err);
            res.sendStatus(500);
            return;
          }

          // Update the password in tbl_account_info and tbl_accounts
          const updatePassQuery = "UPDATE tbl_account_info SET pword = ?, cpword = ? WHERE account_info_id = ?";
          connection.query(updatePassQuery, [hashNewPword, hashConfirmPword, customerID], (err, result) => {
            if (err) {
              console.log("Error updating password:", err);
              res.sendStatus(500);
              return;
            }

            const updateAccountPassQuery = "UPDATE tbl_accounts SET password = ? WHERE account_id = ?";
            connection.query(updateAccountPassQuery, [hashNewPword, customerID], (err, result) => {
              if (err) {
                console.log("Error updating account password:", err);
                res.sendStatus(500);
                return;
              }

              res.sendStatus(200);
            });
          });
        });
      });
    });
  });
});



//FAQ Section
app.post('/add-faq', (req, res) => {
  const addFaq = req.body.addFaq;
  const addDescription = req.body.addDescription;
  const addStatus = req.body.addStatus;
  const insertFaq = "insert into tbl_faq (name, description, status) values (?, ?, ?)";
  connection.query(insertFaq, [addFaq, addDescription, addStatus], (err, result) => {
    if(err) {
      console.log("Failed to insert FAQ's", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/option-faq', (req, res) => {
  const optionFaq = "select faq_id, name from tbl_faq";
  connection.query(optionFaq, (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      const formattedOptions = results.map((options) => ({
        value: options.faq_id,
        label: options.name,
      }));
      res.json(formattedOptions);
    }
  });
});

app.get('/desc-faq', (req, res) => {
  const descFaqID = req.query.descFaqID;
  const descFaq = "select description from tbl_faq where faq_id = ?";
  connection.query(descFaq, [descFaqID], (err, result) => {
    if(err){
      console.log("Failed to get description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-desc-faq', (req, res) => {
  const FaqDescription = req.body.FaqDescription;
  const FaqID = req.body.FaqID;
  const updateFaqDesc = "update tbl_faq set description = ? where faq_id = ?";
  connection.query(updateFaqDesc, [FaqDescription, FaqID], (err, result) => {
    if(err){
      console.log("Failed to update description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/faqs', (req, res) => {
  const selectFaq = "select faq_id, name, description from tbl_faq";
  connection.query(selectFaq, (err, result) => {
    if(err){
      console.log('Failed to fetch FAQ', err);
    }
    else{
      res.send(result);
    }
  });
});

//Privacy Policy Section
app.post('/add-privacy', (req, res) => {
  const addPrivacy = req.body.addPrivacy;
  const addDescription = req.body.addDescription;
  const addStatus = req.body.addStatus;
  const insertPrivacy = "insert into tbl_privacy (name, description, status) values (?, ?, ?)";
  connection.query(insertPrivacy, [addPrivacy, addDescription, addStatus], (err, result) => {
    if(err) {
      console.log("Failed to insert privacy policy", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/option-privacy', (req, res) => {
  const optionPrivacy = "select privacy_id, name from tbl_privacy";
  connection.query(optionPrivacy, (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      const formattedOptions = results.map((options) => ({
        value: options.privacy_id,
        label: options.name,
      }));
      res.json(formattedOptions);
    }
  });
});

app.get('/desc-privacy', (req, res) => {
  const descPrivacyID = req.query.descPrivacyID;
  const descPrivacy = "select description from tbl_privacy where privacy_id = ?";
  connection.query(descPrivacy, [descPrivacyID], (err, result) => {
    if(err){
      console.log("Failed to get description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-desc-privacy', (req, res) => {
  const PrivacyDescription = req.body.PrivacyDescription;
  const PrivacyID = req.body.PrivacyID;
  const updatePrivacyDesc = "update tbl_privacy set description = ? where privacy_id = ?";
  connection.query(updatePrivacyDesc, [PrivacyDescription, PrivacyID], (err, result) => {
    if(err){
      console.log("Failed to update description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/privacy-policy', (req, res) => {
  const getPolicy = 'select * from tbl_privacy';
  connection.query(getPolicy, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

//Terms and Condition Section
app.post('/add-terms', (req, res) => {
  const addTerms = req.body.addTerms;
  const addDescription = req.body.addDescription;
  const addStatus = req.body.addStatus;
  const insertTerms = "insert into tbl_terms (name, description, status) values (?, ?, ?)";
  connection.query(insertTerms, [addTerms, addDescription, addStatus], (err, result) => {
    if(err) {
      console.log("Failed to insert FAQ's", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/option-terms', (req, res) => {
  const optionTerms = "select terms_id, name from tbl_terms";
  connection.query(optionTerms, (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      const formattedOptions = results.map((options) => ({
        value: options.terms_id,
        label: options.name,
      }));
      res.json(formattedOptions);
    }
  });
});

app.get('/desc-terms', (req, res) => {
  const descTermsID = req.query.descTermsID;
  const descTerms = "select description from tbl_terms where terms_id = ?";
  connection.query(descTerms, [descTermsID], (err, result) => {
    if(err){
      console.log("Failed to get description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-desc-terms', (req, res) => {
  const TermsDescription = req.body.TermsDescription;
  const TermsID = req.body.TermsID;
  const updateTermsDesc = "update tbl_terms set description = ? where terms_id = ?";
  connection.query(updateTermsDesc, [TermsDescription, TermsID], (err, result) => {
    if(err){
      console.log("Failed to update description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/terms', (req, res) => {
  const getTerms = `select * from tbl_terms`;
  connection.query(getTerms, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
})

//About Us (Gym Info) Section
// app.post('/add-about', (req, res) => {
//   // const addAbout = req.body.addAbout;
//   const addDescription = req.body.addDescription;
//   const addStatus = req.body.addStatus;
//   const insertAbout = "insert into tbl_about (description, status) values (?, ?)";
//   connection.query(insertAbout, [addDescription, addStatus], (err, result) => {
//     if(err) {
//       console.log("Failed to insert About Us", err);
//     }
//     else{
//       res.send(result);
//     }
//   });
// });

app.post('/add-location', (req, res) => {
  const locationLink = req.body.locationLink;
  const selectLocation = "SELECT * FROM tbl_location";
  const insertLocation = "INSERT INTO tbl_location (location_link) VALUES (?)";
  const updateLocation = "UPDATE tbl_location SET location_link = ?";

  connection.query(selectLocation, (err, rows) => {
    if (err) {
      console.log("Failed to fetch data from tbl_about", err);
      res.sendStatus(500);
    } else {
      if (rows.length === 0) {
        // No existing data, insert new record
        connection.query(insertLocation, [locationLink], (err, result) => {
          if (err) {
            console.log("Failed to insert business location", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Added.');
          }
        });
      } else {
        // Existing data, update the record
        connection.query(updateLocation, [locationLink], (err, result) => {
          if (err) {
            console.log("Failed to update business location", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Updated.');
          }
        });
      }
    }
  });
});

app.get('/location', (req, res) => {
  const getLocation = 'select * from tbl_location';
  connection.query(getLocation, (err, result) => {
    if (err) {
      console.log('Failed to fetch location', err);
    } else {
      res.send(result);
    }
  });
});

app.post('/add-business-hour', (req, res) => {
  const businessStart = req.body.businessStart;
  const businessEnd = req.body.businessEnd;

  const selectHours = "SELECT * FROM tbl_business_hours";
  const insertHours = "INSERT INTO tbl_business_hours (start_time, end_time) VALUES (?, ?)";
  const updateHours = "UPDATE tbl_business_hours SET start_time = ?, end_time = ?";

  connection.query(selectHours, (err, rows) => {
    if (err) {
      console.log("Failed to fetch data from tbl_about", err);
      res.sendStatus(500);
    } else {
      if (rows.length === 0) {
        // No existing data, insert new record
        connection.query(insertHours, [businessStart, businessEnd], (err, result) => {
          if (err) {
            console.log("Failed to insert business hour", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Added.');
          }
        });
      } else {
        // Existing data, update the record
        connection.query(updateHours, [businessStart, businessEnd], (err, result) => {
          if (err) {
            console.log("Failed to update business hour", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Updated.');
          }
        });
      }
    }
  });
});


app.get('/business-hour', (req, res) => {
  const getHours = `select DATE_FORMAT(start_time, '%h:%i %p') as start_time, DATE_FORMAT(end_time, '%h:%i %p') as end_time from tbl_business_hours`
  connection.query(getHours, (err, result) => {
    if (err) {
      console.log('failed to fetch business hour',err);
    } else {
      res.send(result);
    }
  });
});

app.post('/add-fb', (req, res) => {
  const addFacebookName = req.body.addFacebookName;
  const addFacebookLink = req.body.addFacebookLink;
  // const addStatus = req.body.addStatus;
  const selectFacebook = "SELECT * FROM tbl_facebook";
  const insertFacebook = "INSERT INTO tbl_facebook (name, link) VALUES (?, ?)";
  const updateFacebook = "UPDATE tbl_facebook SET name = ?, link = ?";

  connection.query(selectFacebook, (err, rows) => {
    if (err) {
      console.log("Failed to fetch data from tbl_about", err);
      res.sendStatus(500);
    } else {
      if (rows.length === 0) {
        // No existing data, insert new record
        connection.query(insertFacebook, [addFacebookName, addFacebookLink], (err, result) => {
          if (err) {
            console.log("Failed to insert Facebook Details", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Added.');
          }
        });
      } else {
        // Existing data, update the record
        connection.query(updateFacebook, [addFacebookName, addFacebookLink], (err, result) => {
          if (err) {
            console.log("Failed to update FacebookDetails", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Updated.');
          }
        });
      }
    }
  });
});

app.get('/facebook', (req, res) => {
  const getData = `select * from tbl_facebook`;
  connection.query(getData, (err, result) => {
    if (err) {
      console.log('Failed to fetch facebook data', err);
    } else {
      res.send(result);
    }
  });
});

app.post('/add-about', (req, res) => {
  const addDescription = req.body.addDescription;
  // const addStatus = req.body.addStatus;
  const selectAbout = "SELECT * FROM tbl_about";
  const insertAbout = "INSERT INTO tbl_about (description, status) VALUES (?, 'Active')";
  const updateAbout = "UPDATE tbl_about SET description = ?, status = 'Active'";

  connection.query(selectAbout, (err, rows) => {
    if (err) {
      console.log("Failed to fetch data from tbl_about", err);
      res.sendStatus(500);
    } else {
      if (rows.length === 0) {
        // No existing data, insert new record
        connection.query(insertAbout, [addDescription], (err, result) => {
          if (err) {
            console.log("Failed to insert About Us", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Added.');
          }
        });
      } else {
        // Existing data, update the record
        connection.query(updateAbout, [addDescription], (err, result) => {
          if (err) {
            console.log("Failed to update About Us", err);
            res.sendStatus(500);
          } else {
            res.send('Successfully Updated.');
          }
        });
      }
    }
  });
});


app.get('/option-about', (req, res) => {
  const optionAbout = "select about_id from tbl_about";
  connection.query(optionAbout, (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      const formattedOptions = results.map((options) => ({
        value: options.about_id,
        label: options.name,
      }));
      res.json(formattedOptions);
    }
  });
});

// app.get('/desc-about', (req, res) => {
//   const descAboutID = req.query.descAboutID;
//   const descAbout = "select description from tbl_about where about_id = ?";
//   connection.query(descAbout, [descAboutID], (err, result) => {
//     if(err){
//       console.log("Failed to get description", err);
//     }
//     else{
//       res.send(result);
//     }
//   });
// });

app.get('/desc-about', (req, res) => {
  const descAbout = 'select description from tbl_about';
  connection.query(descAbout, (err, result) => {
    if (err) {
      console.log('Failed to get description', err);
    } else {
      res.send(result);
    }
  });
});

app.put('/update-desc-about', (req, res) => {
  const AboutDescription = req.body.AboutDescription;
  const AboutID = req.body.AboutID;
  const updateAboutDesc = "update tbl_about set description = ? where about_id = ?";
  connection.query(updateAboutDesc, [AboutDescription, AboutID], (err, result) => {
    if(err){
      console.log("Failed to update description", err);
    }
    else{
      res.send(result);
    }
  });
});

//Service Offer
app.post('/add-service-offer', (req, res) => {
  const name = req.body.name;
  const desc = req.body.desc;
  const add = 'insert into tbl_service_offer (name, description) values (?, ?)';
  connection.query(add, [name, desc], (err, result) => {
    if (err) {
      console.log('Failed to add service offer', err);
    } else {
      res.send(result);
    }
  });
});

app.get('/service-offer', (req, res) => {
  const get = 'select * from tbl_service_offer';
  connection.query(get, (err, result) => {
    if (err) {
      console.log('Failed to get service offer', err);
    } else {
      res.send(result);
    }
  });
});

app.get('/option-service', (req, res) => {
  const optionPrivacy = "select service_offer_id, name from tbl_service_offer";
  connection.query(optionPrivacy, (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      const formattedOptions = results.map((options) => ({
        value: options.service_offer_id,
        label: options.name,
      }));
      res.json(formattedOptions);
    }
  });
});

app.get('/desc-service', (req, res) => {
  const descServiceID = req.query.descServiceID;
  const descPrivacy = "select description from tbl_service_offer where service_offer_id = ?";
  connection.query(descPrivacy, [descServiceID], (err, result) => {
    if(err){
      console.log("Failed to get description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-desc-service', (req, res) => {
  const ServiceDescription = req.body.ServiceDescription;
  const serviceID = req.body.serviceID;
  const updateAboutDesc = "update tbl_service_offer set description = ? where service_offer_id = ?";
  connection.query(updateAboutDesc, [ServiceDescription, serviceID], (err, result) => {
    if(err){
      console.log("Failed to update description", err);
    }
    else{
      res.send(result);
    }
  });
});

//Invetory Management
app.get('/inventory', (req, res) => {
  const products = "select product_id, product_name, product_desc, category, price, stock,  DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, product_status from tbl_products order by product_id desc";
  connection.query(products, (err, result) => {
    if(err){
      console.log("Failed to fetch products", err);
    }
    else{
      res.send(result);
    }
  });
});

app.post('/product-check', (req, res) => {
  const prodName = req.body.prodName;
  const checkName = 'SELECT COUNT(*) as count FROM tbl_products WHERE product_name = ?';
  connection.query(checkName, [prodName], (err, result) => {
    if (err) {
      console.log('Error executing MySQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    const isTaken = result[0].count > 0;
    res.json({ isTaken });
  });
});

app.post('/add-products', (req, res) => {
  const prodName = req.body.prodName;
  const prodDesc = req.body.prodDesc;
  const prodCateg = req.body.prodCateg;
  const prodPrice = req.body.prodPrice;
  const formattedPrice = Number(prodPrice).toFixed(2);
  const prodQuantity = req.body.prodQuantity;
  const prodStatus = req.body.prodStatus;
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);
  const addProd = `INSERT INTO tbl_products (product_name, product_desc, category, price, stock, status, date, time, product_status) VALUES (?, ?, ?, ?, ?, ?, '${currentDate}', '${currentTime}', 'Show')`;
  connection.query(addProd, [prodName, prodDesc, prodCateg, formattedPrice, prodQuantity, prodStatus], (err, result) => {
    if (err) {
      console.log('Failed to add product:', err);
      res.status(500).json({ error: 'Failed to add product' });
    } else {
      res.json({ success: true });
    }
  });
});

app.get('/option-inventory', (req, res) => {
  // const prodID = req.query.prodID;
  // const optionInventory = "select product_id, product_name, price from tbl_products where product_id = ?";
  const optionInventory = "select product_id, product_name from tbl_products";
  connection.query(optionInventory, (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      const formattedOptions = results.map((options) => ({
        value: options.product_id,
        label: options.product_name,
        // price: options.price,
      }));
      res.json(formattedOptions);
    }
  });
});

app.get('/price-inventory', (req, res) => {
  const prodID = req.query.prodID;
  const prodPrice = "select product_name, product_desc, category, price from tbl_products where product_id = ?";
  connection.query(prodPrice, [prodID], (err, results) => {
    if(err) {
      console.log("Failed to get option", err);
    }
    else{
      res.send(results);
    }
  });
});


app.put('/update-inventory', (req, res) => {
  const prodID = req.body.prodID;
  const newProdPrice = req.body.newProdPrice;
  const newProdQty = req.body.newProdQty;
  const newProdDesc = req.body.newProdDesc;
  const newProdCat = req.body.newProdCat;

  const prodUpdate = "update tbl_products set price = ?, stock = stock + ?, product_desc = ?, category = ? where product_id = ?";
  connection.query(prodUpdate, [newProdPrice, newProdQty, newProdDesc, newProdCat, prodID], (err, result) => {
    if(err){
      console.log("Failed to get description", err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-prod-status', (req, res) => {
  const prodID = req.body.prodID;
  const newProdStatus = req.body.newProdStatus;

  const updateProdStatus = `update tbl_products set product_status = '${newProdStatus}' where product_id = ${prodID}`;
  connection.query(updateProdStatus, (err, result) => {
    if(err){
      console.log('Failed to update product status.', err);
    }
    else{
      res.send(result);
    }
  });
});
//POS
app.get('/pos-inventory', (req, res) => {
  const products = "select product_id, product_name, category, price, stock from tbl_products where stock > 5 and product_status = 'Show'";
  connection.query(products, (err, result) => {
    if(err){
      console.log("Failed to fetch products", err);
    }
    else{
      res.send(result);
    }
  });
});
app.post('/add-orders-temp', (req, res) => {
  const prodID = req.body.prodID;
  const prodName = req.body.prodName;
  const prodCategory = req.body.prodCategory;
  const prodPrice = req.body.prodPrice;
  const prodQty = req.body.prodQty;
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);

  const addOrderTemp = `insert into tbl_orders_temp (product_id, product_name, category, price, qty, date, time) values (?, ?, ?, ?, ?, '${currentDate}', '${currentTime}')`;
  connection.query(addOrderTemp, [prodID, prodName, prodCategory, prodPrice, prodQty], (err, result) => {
    if(err){
      console.log("Failed to add orders", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/orders-temp', (req, res) => {
  const products = "select order_temp_id, product_id, product_name, category, price, qty, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time from tbl_orders_temp";
  connection.query(products, (err, result) => {
    if(err){
      console.log("Failed to fetch products", err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/sum-price', (req, res) => {
  const query = 'SELECT SUM(price) AS total FROM tbl_orders_temp';
  connection.query(query, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const total = results[0].total || 0;
      res.json({ total });
    }
  });
});

app.put('/update-products', (req, res) => {

  const prodIDs = req.body.prodID;
  const quantities = req.body.prodQty;

  const updateProductQty = "UPDATE tbl_products SET stock = stock - ? WHERE product_id = ?";

  for (let i = 0; i < prodIDs.length; i++) {
    connection.query(updateProductQty, [quantities[i], prodIDs[i]], (err, result) => {
      if (err) {
        console.log('Failed to update product with ID:', prodIDs[i]);
        console.log(err);
      } else {
        // console.log('Product with ID', prodIDs[i], 'updated successfully');
      }
    });
  }
  res.send('Products updated successfully');
});

app.post('/add-orders', (req, res) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const prodIDs = req.body.prodIDs;
  const prodNames = req.body.prodNames;
  const prodPrice = req.body.prodPrice;
  const quantities = req.body.quantities;
  const orderNum = req.body.orderNum;
  const insertOrders = `insert into tbl_orders (product_name, price, qty, date, order_number) values (?, ?, ?, '${currentDate}', ${orderNum})`;

  for (let i = 0; i < prodIDs.length; i++) {
    connection.query(insertOrders, [prodNames[i], prodPrice[i], quantities[i]], (err, result) => {
      if (err) {
        console.log('Failed to update product with ID:', prodIDs[i]);
        console.log(err);
      } else {
        console.log('Product with ID', prodIDs[i], 'updated successfully');
      }
    });
  }
  res.send('Products updated successfully');
});

app.post('/add-sales', (req, res) => {
  const orderNum = req.body.orderNum;
  const currentDate = new Date().toISOString().slice(0, 10);
  const total = req.body.total;
  const currentTime = new Date().toTimeString().slice(0, 8);
  // const formattedTime = currentTime;
  const insertSales = `insert into tbl_sales_report (order_number, total, date, time) values (?, ?, '${currentDate}', '${currentTime}')`;
  connection.query(insertSales, [orderNum, total], (err, result) => {
    if(err){
      console.log('Failed to add sales report', err);      
    }
    else{
      res.send(result);
    }
  });
});



app.delete('/clean-order-temp', (req, res) => {
  const cleanTemp = "truncate table tbl_orders_temp";
  connection.query(cleanTemp, (err, result) => {
    if(err){
      console.log('Failed to delete order temp', err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/product-stock', (req, res) => {
  const prodID = req.query.prodID;
  const stock = `select stock, price from tbl_products where product_id = ${prodID}`;
  connection.query(stock, (err, result) => {
    if(err){
      console.log('Failed to fetch stock', err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-order-qty', (req, res) => {
  const prodID = req.body.prodID;
  const prodPrice = req.body.prodPrice;
  const prodQty = req.body.prodQty;
  const stock = `update tbl_orders_temp set qty = ?, price = ?  where product_id = ${prodID}`;
  connection.query(stock, [prodQty, prodPrice], (err, result) => {
    if(err){
      console.log('Failed to fetch stock', err);
    }
    else{
      res.send(result);
    }
  });
});

app.delete('/void', (req, res) => {
  const orderTempID = req.query.orderTempID;
  const voidItem = `delete from tbl_orders_temp where order_temp_id = '${orderTempID}'`;
  connection.query(voidItem, (err, result) => {
    if(err){
      console.log('Failed to delete item', err);
    }
    else{
      res.send(result);
    }
  });
});
//Sales Report

app.get('/fetch-total-sales', (req, res) => {
  const totalSales = `select SUM(total) as total from tbl_sales_report`;
  connection.query(totalSales, (err, result) => {
    if (err) {
      console.log('Failed to fetch total sales', err);
    } else {
      res.send(result);
    }
  });
});


app.get('/fetch-total-sales-today', (req, res) => {
  const currentDate = new Date().toISOString().slice(0, 10);

  const totalSales = `select SUM(total) as total from tbl_sales_report where date = '${currentDate}'`;
  connection.query(totalSales, (err, result) => {
    if (err) {
      console.log('Failed to fetch total sales', err);
    } else {
      res.send(result);
    }
  });
});

app.get('/sales-report', (req, res) => {
  const viewSales = "select sales_report_id, description, total, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, category from tbl_sales_report order by sales_report_id desc";
  connection.query(viewSales, (err, result) => {
    if(err){
      console.log('Failed to fetch sales report', err);
    }
    else{
      res.send(result);
    }
  }); 
});

app.get('/sum-linegraph-sales-report', (req, res) => {
  const lineGraph = "SELECT DATE_FORMAT(date, '%M %d, %Y') AS date, SUM(total) AS total FROM tbl_sales_report GROUP BY date";
  connection.query(lineGraph, (err, result) => {
    if (err) {
      console.log('Failed to fetch sales report', err);
      res.status(500).send('Failed to fetch sales report');
    } else {
      res.send(result);
    }
  });
});

app.get('/category-sales-report', (req, res) => {
  const barGraph = `SELECT category, SUM(total) AS total FROM tbl_sales_report GROUP BY category`;
  connection.query(barGraph, (err, result) => {
    if(err){
      console.log('Failed to fetch sales report', err);
    }
    else{
      res.send(result);
    }
  }); 
});

app.get('/filter-sales-report', (req, res) => {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const filterDate = `select sales_report_id, description, total, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, category from tbl_sales_report where date between ? and ?`;
  connection.query(filterDate, [startDate, endDate], (err, result) => {
    if (err) {
      console.log('Failed to fetch filtered date', err);
    } else {
      res.send(result);
    }
  });
});

app.get('/filter-sales-report-category', (req, res) => {
  const category = req.query.category;

  const filterDate = `select sales_report_id, description, total, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, category from tbl_sales_report where category = ?`;
  connection.query(filterDate, [category], (err, result) => {
    if (err) {
      console.log('Failed to fetch filtered date', err);
    } else {
      res.send(result);
    }
  });
});


//Sum Daily
app.get('/daily-sales', (req, res) => {
  const dailySales = `SELECT sales_report_id, DATE_FORMAT(date, '%M %d, %Y') AS day, SUM(total) AS daily_total FROM tbl_sales_report GROUP BY DAY(date) order by sales_report_id desc`;
  connection.query(dailySales, (err, result) => {
    if(err){
      console.log('Failed to fetch daily sales report', err);
    }
    else{
      res.send(result)
    }
  });
});
//Weekly
app.get('/weekly-sales', (req, res) => {
  const weeklySales = `SELECT sales_report_id, YEAR(date) AS year, WEEK(date) AS week, SUM(total) AS weekly_total FROM tbl_sales_report GROUP BY YEAR(date), WEEK(date) order by sales_report_id desc`;
  connection.query(weeklySales, (err, result) => {
    if(err){
      console.log('Failed to fetch weekly sales report', err);
    }
    else{
      res.send(result)
    }
  });
});
//monthly
app.get('/monthly-sales', (req, res) => {
  const monthlySales = `SELECT sales_report_id, YEAR(date) AS year, MONTHNAME(date) AS month, SUM(total) AS monthly_total FROM tbl_sales_report GROUP BY YEAR(date), MONTH(date) order by sales_report_id desc`;
  connection.query(monthlySales, (err, result) => {
    if(err){
      console.log('Failed to fetch monthly sales report', err);
    }
    else{
      res.send(result)
    }
  });
});
//yearly
// 
app.get('/yearly-sales', (req, res) => {
  const yearlySales = `SELECT sales_report_id, YEAR(date) AS year, SUM(total) AS yearly_total FROM tbl_sales_report GROUP BY YEAR(date) order by sales_report_id desc`;
  connection.query(yearlySales, (err, result) => {
    if(err){
      console.log('Failed to fetch yearly sales report', err);
    }
    else{
      res.send(result)
    }
  });
});



//Workouts
app.post('/add-workout', (req, res) => {
  const name = req.body.name;
  // const type = req.body.type;
  // const price = req.body.price;
  const type = 'Daily Session';
  const price = 70;
  const formattedPrice = Number(price).toFixed(2);
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date();
  const formattedTime = currentTime.toTimeString().slice(0, 8);
  const insertWorkout = `insert into tbl_workout (name, type, price, date, time) values ('${name}', '${type}', '${formattedPrice}', '${currentDate}', '${formattedTime}')`;
  connection.query(insertWorkout, (err, result) => {
    if(err){
      console.log('Failed to add workout', err);
    }
    else{
      // res.send(result)
      const salesWorkout = `Workout ID: ${result.insertId}, Customer Name: ${name}`;
      const insertSales = `insert into tbl_sales_report (description, total, date, time, category) values ('${salesWorkout}', '${formattedPrice}', '${currentDate}', '${formattedTime}', 'Work-out')`;
      connection.query(insertSales, (err, insertSalesResult) => {
        if(err){
          console.log('Failed to add sales workout', err);
        }
        else{
          res.send(result);
        }
      });
    }
  });
});

app.get('/workouts', (req, res) => {
  const workouts = "select workout_id, name, type, price, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time from tbl_workout order by workout_id desc";
  connection.query(workouts, (err, result) => {
    if(err){
      console.log('Failed to fetch Workouts ', err);
    }
    else{
      res.send(result);
    }
  });
});

app.post('/add-expenses', (req, res) => {
  const desc = req.body.desc;
  const price = req.body.price;
  const formattedPrice = Number(price).toFixed(2);
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date();
  const formattedTime = currentTime.toTimeString().slice(0, 8);
  const insertExpenses = `insert into tbl_expenses (description, price, date, time) values ('${desc}', '${formattedPrice}', '${currentDate}', '${formattedTime}')`;
  connection.query(insertExpenses, (err, result) => {
    if(err){
      console.log('Failed to add expenses', err);
    }
    else{
      res.send(result)
    }
  });
});

app.get('/expenses', (req, res) => {
  const workouts = "select expenses_id, description, price, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time from tbl_expenses";
  connection.query(workouts, (err, result) => {
    if(err){
      console.log('Failed to fetch Expenses ', err);
    }
    else{
      res.send(result);
    }
  });
});

//Locker
// app.post('/add-locker', (req, res) => {
//   const name = req.body.name;
//   const contact = req.body.contact;
//   const key = req.body.key;
//   const amount = req.body.amount;
//   const startdate = req.body.startdate;
//   const enddate = req.body.enddate;
//   //const totaldays = req.body.totaldays;
//   const currentDate = new Date().toISOString().slice(0, 10);
//   const currentTime = new Date().toTimeString().slice(0, 8);

//   const addLocker = `insert into tbl_locker (name, contact_no, key_no, amount, start_date, end_date, total_days, date, time) values ('${name}', '${contact}', '${key}', '${amount}', '${startdate}', '${enddate}', DATEDIFF('${enddate}', '${startdate}'), '${currentDate}', '${currentTime}')`;
//   connection.query(addLocker, (err, result) => {
//     if(err){
//       console.log('Failed to add locker', err);
//     }
//     else{
//       res.send(result);
//     }
//   });
// });

app.post('/add-locker', (req, res) => {
  const name = req.body.name;
  const contact = req.body.contact;
  const key = req.body.key;
  const amount = req.body.amount;
  const startdate = req.body.startdate;
  const enddate = req.body.enddate;

  // Check if the key is already used
  const checkKeyQuery = `SELECT * FROM tbl_locker WHERE key_no = '${key}' AND start_date <= '${enddate}' AND end_date >= '${startdate}'`;
  connection.query(checkKeyQuery, (err, rows) => {
    if (err) {
      console.log('Error checking key:', err);
      res.status(500).json({ error: 'Failed to check key' });
    } else {
      if (rows.length > 0) {
        // The key is already used and not available until the end date
        res.status(400).json({ error: 'The selected key is not available' });
      } else {
        // The key is available, proceed with adding the locker
        const currentDate = new Date().toISOString().slice(0, 10);
        const currentTime = new Date().toTimeString().slice(0, 8);

        const addLocker = `INSERT INTO tbl_locker (name, contact_no, key_no, amount, start_date, end_date, total_days, date, time) VALUES ('${name}', '${contact}', '${key}', '${amount}', '${startdate}', '${enddate}', DATEDIFF('${enddate}', '${startdate}'), '${currentDate}', '${currentTime}')`;

        connection.query(addLocker, (err, result) => {
          if (err) {
            console.log('Failed to add locker', err);
            res.status(500).json({ error: 'Failed to add locker' });
          } else {
            const salesLocker = `Locker ID: ${result.insertId}, Customer Name: ${name}`;
            const insertSales = `insert into tbl_sales_report (description, total, date, time, category) values ('${salesLocker}', '${amount}', '${currentDate}', '${currentTime}', 'Locker')`;
            connection.query(insertSales, (err, insertSalesResult) => {
              if(err){
                console.log('Failed to add sales workout', err);
              }
              else{
                res.send(result);
              }
            });
            // res.status(200).json({ success: true });
          }
        });
      }
    }
  });
});
app.get('/locker', (req, res) => {
  const getLocker = "select locker_id, name, contact_no, key_no, amount, DATE_FORMAT(start_date, '%M %d, %Y') as start_date, DATE_FORMAT(end_date, '%M %d, %Y') as end_date, total_days, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time from tbl_locker order by locker_id desc";
  connection.query(getLocker, (err, result) => {
    if(err){
      console.log('Failed to fetch locker', err);
    }
    else{
      res.send(result);
    }
  });
});

app.post('/membership-attendance', (req, res) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);
  const accountName = req.body.accountName;
  const checkAttendanceQuery = 'SELECT * FROM tbl_attendance WHERE name = ? AND DATE(time_in) = CURDATE()';
  connection.query(checkAttendanceQuery, [accountName], (err, results) => {
    if (err) {
      console.log('Failed to check attendance', err);
    } else {
      if (results.length === 0) {
        // No attendance record exists, insert a new record with time_in
        const insertAttendanceQuery = 'INSERT INTO tbl_attendance (name, time_in, date) VALUES (?, ?, ?)';
        connection.query(insertAttendanceQuery, [accountName, currentTime, currentDate], (err) => {
          if (err) {
            console.log('Failed to insert attendance record', err);
          } else {
            // console.log('Attendance record inserted');
          }
        });
      } else {
        // Attendance record already exists, update the existing record with time_out
        const updateAttendanceQuery = 'UPDATE tbl_attendance SET time_out = ? WHERE name = ? AND DATE(time_in) = CURDATE()';
        connection.query(updateAttendanceQuery, [currentTime, accountName], (err) => {
          if (err) {
            console.log('Failed to update attendance record', err);
          } else {
            // console.log('Attendance record updated');
          }
        });
      }
    }
  });
});

app.get('/attendance', (req, res) => {
  const getAttendance = `
    SELECT
      attendance_id,
      name,
      status,
      DATE_FORMAT(time_in, '%h:%i:%s %p') AS time_in,
      CASE
        WHEN time_out = '' THEN ''
        ELSE DATE_FORMAT(STR_TO_DATE(time_out, '%H:%i:%s'), '%h:%i:%s %p')
      END AS time_out,
      DATE_FORMAT(date, '%M %d, %Y') AS date
    FROM
      tbl_attendance
    ORDER BY
      attendance_id DESC
  `;
  connection.query(getAttendance, (err, result) => {
    if (err) {
      console.log('Failed to fetch attendance', err);
      res.status(500).send('Failed to fetch attendance');
    } else {
      res.send(result);
    }
  });
});


app.put('/update-attendance', (req, res) => {
  const getLastInsertedId = 'SELECT attendance_id FROM tbl_attendance ORDER BY attendance_id DESC LIMIT 1';
  connection.query(getLastInsertedId, (err, result) => {
    if (err) {
      console.log('Failed to fetch last inserted ID', err);
      res.sendStatus(500);
    } else {
      const attendanceId = result[0].attendance_id;
      const currentTime = new Date().toTimeString().slice(0, 8);
      // Update the last inserted attendance record
      const updateAttendanceQuery = `UPDATE tbl_attendance SET time_out = '${currentTime}', status = 'Inactive' WHERE attendance_id = ?`;
      connection.query(updateAttendanceQuery, [attendanceId], (err, updateResult) => {
        if (err) {
          console.log('Failed to update attendance', err);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      });
    }
  });
})

//Employee User
// app.post('/add-employee', (req, res) => {
//   const fname = req.body.fname;
//   const lname = req.body.lname;
//   const age = req.body.age;
//   const gender = req.body.gender;
//   const bday = req.body.bday;
//   const role = req.body.role;
//   const email = req.body.email;
//   const pword = req.body.pword;
//   const cpword = req.body.cpword;
//   const currentDate = new Date().toISOString().slice(0, 10);

// });

// app.post("/insert-employee", (req, res) => {
//   const currentDate = new Date().toISOString().slice(0, 10);
//   const currentTime = new Date().toTimeString().slice(0, 8);
//   const userFname = req.body.userFname;
//   const userLname = req.body.userLname;
//   const userAge = req.body.userAge;
//   const userGender = req.body.userGender;
//   const userBday = req.body.userBday;
//   const userEmail = req.body.userEmail;
//   const userPword = req.body.userPword;
//   const userCPword = req.body.userCPword;
//   const userRole = req.body.userRole;
//   const checkEmailQuery = 'SELECT * FROM tbl_account_info WHERE email = ?';
//   connection.query(checkEmailQuery, [userEmail], (err, results) => {
//     if (err) {
//       console.log('Failed to query email', err);
//       res.sendStatus(500);
//     } else if (results.length > 0) {
//       // Email already exists
//       res.status(400).json({ error: 'Email already exists' });
//     } else {
//       // Email does not exist, proceed with insertion
//       const sqlInsert = `INSERT INTO tbl_account_info (fname, lname, age, gender, bday, email, pword, cpword, role, date_created, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '${currentDate}', 'Active')`;
//       connection.query(
//         sqlInsert,
//         [userFname, userLname, userAge, userGender, userBday, userEmail, userPword, userCPword, userRole],
//         (err, result) => {
//           if (err) {
//             console.log('Failed to add account info', err);
//             res.sendStatus(500);
//           } else {
//             const accountId = result.insertId;
//             console.log('Last Inserted Account ID:', accountId);
//             const sqlAccount = `INSERT INTO tbl_accounts (email, password, role, status) VALUES (?, ?, ?, 'Active')`;
//             connection.query(sqlAccount, [userEmail, userPword, userRole], (err, results) => {
//               if (err) {
//                 console.log('Failed to add account', err);
//                 res.sendStatus(500);
//               } else {
//                 const action = `Created new account: ${userFname}`;
//                 const audit = `insert into tbl_audit (action, date, time) values ('${action}', '${currentDate}','${currentTime}')`;
//                 connection.query(audit, (err, auditResult) => {
//                   if(err){
//                     console.log('Failed to add audit', err);
//                   }
//                   else{
//                     res.send(auditResult);
//                   }
//                 });
//               }
//             });
//           }
//         }
//       );
//     }
//   });
// });

app.post("/insert-employee", (req, res) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);
  const userFname = req.body.userFname;
  const userLname = req.body.userLname;
  const userAge = req.body.userAge;
  const userGender = req.body.userGender;
  const userBday = req.body.userBday;
  const userEmail = req.body.userEmail;
  const userPword = req.body.userPword;
  const userCPword = req.body.userCPword;
  const userRole = req.body.userRole;

  // Hash the passwords
  bcrypt.hash(userPword, 10, (err, hashUserPword) => {
    if (err) {
      console.log('Error hashing password', err);
      res.sendStatus(500);
      return;
    }
    bcrypt.hash(userCPword, 10, (err, hashConfirmPword) => {
      if (err) {
        console.log('Error hashing confirm password', err);
        res.sendStatus(500);
        return;
      }

      const checkEmailQuery = 'SELECT * FROM tbl_account_info WHERE email = ?';
      connection.query(checkEmailQuery, [userEmail], (err, results) => {
        if (err) {
          console.log('Failed to query email', err);
          res.sendStatus(500);
        } else if (results.length > 0) {
          // Email already exists
          res.status(400).json({ error: 'Email already exists' });
        } else {
          // Email does not exist, proceed with insertion
          const sqlInsert = `INSERT INTO tbl_account_info (fname, lname, age, gender, bday, email, pword, cpword, role, date_created, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '${currentDate}', 'Active')`;
          connection.query(
            sqlInsert,
            [userFname, userLname, userAge, userGender, userBday, userEmail, hashUserPword, hashConfirmPword, userRole],
            (err, result) => {
              if (err) {
                console.log('Failed to add account info', err);
                res.sendStatus(500);
              } else {
                const accountId = result.insertId;
                console.log('Last Inserted Account ID:', accountId);
                const sqlAccount = `INSERT INTO tbl_accounts (email, password, role, status) VALUES (?, ?, ?, 'Active')`;
                connection.query(sqlAccount, [userEmail, hashUserPword, userRole], (err, results) => {
                  if (err) {
                    console.log('Failed to add account', err);
                    res.sendStatus(500);
                  } else {
                    const action = `Created new account: ${userFname}`;
                    const audit = `insert into tbl_audit (action, date, time) values ('${action}', '${currentDate}','${currentTime}')`;
                    connection.query(audit, (err, auditResult) => {
                      if (err) {
                        console.log('Failed to add audit', err);
                      } else {
                        const dashboard = req.body.dashboard;
                        const reservation = req.body.reservation;
                        const window = req.body.window;
                        const sales = req.body.sales;
                        const settings = req.body.settings;
                        const userAccount = req.body.userAccount;
                        const audit = req.body.audit;
                        const attendance = req.body.attendance;
                        const health = req.body.health;
                        const announcement = req.body.announcement;
        
                        const addRole = `insert into tbl_modules (account_info_id, dashboard, reservation, window_payment, sales_report, settings, user_account, audit_trail, attendance_log, health_guide, announcement) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        connection.query(addRole, [accountId, dashboard, reservation, window, sales, settings, userAccount, audit, attendance, health, announcement], (err, result) => {
                          if (err) {
                            console.log('Failed to add role', err);
                            // res.status(300).send('Failed to add role', err);
                          } else {
                            res.sendStatus(200);
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          );
        }
      });
    });
  });
});




app.get('/employee-list', (req, res) => {
  const employeeList = `select account_info_id, fname, lname, age, gender, DATE_FORMAT(bday, '%M %d, %Y') as bday, email, role, DATE_FORMAT(date_created, '%M %d, %Y') as date_created, status from tbl_account_info where role = 'staff' or role = 'cashier' order by account_info_id desc`;
  connection.query(employeeList, (err, result) => {
    if(err){
      console.log('Failed to fetch employee list',err);
    }
    else{
      res.send(result);
    }
  });
});

app.put('/update-account-status', (req, res) => {
  const accID = req.body.accID;
  const status = req.body.status;
  const updateAcc = `update tbl_accounts set status = ? where account_id = ?`;
  connection.query(updateAcc, [status, accID], (err, result) => {
    if(err){
      console.log('Failed to update acc', err);
    } else {
      const updateAccInfo = `update tbl_account_info set status = ? where account_info_id = ?`;
      connection.query(updateAccInfo, [status, accID], (err, updateResult) => {
        if(err) {
          console.log('Failed to update account info', err);
        } else {
          res.send(updateResult.data);
        }
      });
    }
  });
});

app.get('/audit', (req, res) => {
  const audit = `select audit_id, action, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time from tbl_audit order by audit_id desc`;
  connection.query(audit, (err, result) => {
    if(err){
      console.log('failed to fetch audit', err);
    }
    else{
      res.send(result);
    }
  });
});

// app.post('/add-health-guide', (req, res) => {
//   const imageData = req.body.imageData;
//   const name = req.body.name;
//   const equipment = req.body.equipment;
//   const instruction = req.body.instruction;

//   const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
//   const buffer = Buffer.from(base64Data, 'base64');
//   // const buffer = Buffer.from(imageData);

//   const insertImageQuery = `INSERT INTO tbl_health_guide (name, equipment, instruction, instruction_image) VALUES (?, ?, ?, ?)`;
//   connection.query(insertImageQuery, [name, equipment, instruction, buffer], (err, result) => {
//     if (err) {
//       console.log('Error inserting image:', err);
//       res.status(500).json({ error: 'Failed to insert image' });
//     } else {
//       res.send('Image uploaded successfully', result);
//     }
//   });
// });

app.post('/add-health-guide', (req, res) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);
  const imageData = req.body.imageData;
  const name = req.body.name;
  const equipment = req.body.equipment;
  const instruction = req.body.instruction;
  const accID = req.body.accID;

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const insertImageQuery = `INSERT INTO tbl_health_guide (name, equipment, instruction, instruction_image) VALUES (?, ?, ?, ?)`;
  connection.query(insertImageQuery, [name, equipment, instruction, buffer], (err, result) => {
    if (err) {
      console.log('Error inserting image:', err);
      res.status(500).json({ error: 'Failed to insert image' });
    } else {
      const selectFname = `select fname from tbl_account_info where account_info_id = ?`;
      connection.query(selectFname, [accID], (err, fnameResult) => {
        if(err){
          console.log('Failed to fetch first name', err);
        }else{
          const fname = fnameResult[0].fname;
          const action = `${fname} -  Created new health guide: ${name}`;
          const audit = `insert into tbl_audit (action, date, time) values ('${action}', '${currentDate}','${currentTime}')`;
          connection.query(audit, (err, auditResult) => {
            if(err){
              console.log('Failed to add audit', err);
            }
            else{
              res.send(auditResult);
              // res.status(200).send('Image uploaded successfully');
            }
          });
        }
      });
    }
  });
});


app.get('/health-guide', (req, res) => {
  const getHealthGuide = 'select health_guide_id, name, equipment, instruction, instruction_image from tbl_health_guide';
  connection.query(getHealthGuide, (err, result) => {
    if(err){
      console.log('Failed to fetch health guide', err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/health-guide-image', (req, res) => {
  const healthID = req.query.healthID;
  const getHealthGuide = 'select instruction_image from tbl_health_guide where health_guide_id = ?';
  connection.query(getHealthGuide, [healthID], (err, result) => {
    if(err){
      console.log('Failed to fetch health guide', err);
    }
    else{
      res.send(result);
    }
  });
});

app.post('/add-announcement', (req, res) => {
  const annTitle = req.body.annTitle;
  const annContent = req.body.annContent;
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);

  const accID = req.body.accID;

  const addAnnouncement = `insert into tbl_announcement (title, ann_content, date, time, status) values (?, ?, '${currentDate}', '${currentTime}', 'Unread')`;
  connection.query(addAnnouncement, [annTitle, annContent], (err, result) => {
    if(err){
      console.log('Failed to add announcement', err);
    }
    else{
      const selectFname = `select fname from tbl_account_info where account_info_id = ?`;
      connection.query(selectFname, [accID], (err, fnameResult) => {
        if(err){
          console.log('Failed to fetch first name', err);
        }else{
          const fname = fnameResult[0].fname;
          const action = `${fname} -  Created new announcement: ${annTitle}`;
          const audit = `insert into tbl_audit (action, date, time) values ('${action}', '${currentDate}','${currentTime}')`;
          connection.query(audit, (err, auditResult) => {
            if(err){
              console.log('Failed to add audit', err);
            }
            else{
              res.send(auditResult);
              // res.status(200).send('Image uploaded successfully');
            }
          });
        }
      });
    }
  });
});

app.get('/announcement', (req, res) => {
  const announcement = `select announcement_id, title, ann_content, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, status from tbl_announcement order by announcement_id desc`;
  connection.query(announcement, (err, result) => {
    if(err){
      console.log('Failed to fetch announcement', err);
    }
    else{
      res.send(result);
    }
  });
});

// Original Code
// app.post('/add-proof-of-payment', (req, res) => {
//   const userID = req.body.userID;
//   const refNum = req.body.refNum;
//   const amount = req.body.amount;
//   const imageData = req.body.imageData;
//   const desc = req.body.desc;
//   const currentDate = new Date().toISOString().slice(0, 10);
//   const currentTime = new Date().toTimeString().slice(0, 8);
//   const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
//   const buffer = Buffer.from(base64Data, 'base64');

//   const getFname = `SELECT fname, email FROM tbl_account_info WHERE account_info_id = ?`;
//   connection.query(getFname, [userID], (err, fnameResult) => {
//     if (err) {
//       console.log('Failed to get first name', err);
//       res.status(500).send('Failed to get first name');
//     } else {
//       const fname = fnameResult[0].fname;
//       const email = fnameResult[0].email;
//       const addProof = `INSERT INTO tbl_proof_of_payment (account_info_id, email, name, description, reference_number, amount, image, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;
//       connection.query(
//         addProof,
//         [userID, email, fname, desc, refNum, amount, buffer, currentDate, currentTime],
//         (err, proofResult) => {
//           if (err) {
//             console.log('Failed to insert proof of payment', err);
//             res.status(500).send('Failed to insert proof of payment');
//           } else {
//             const insertedId = proofResult.insertId;
//             res.send({ insertedId });
//           }
//         }
//       );
//     }
//   });
// });


app.post('/add-proof-of-payment', (req, res) => {
  const userID = req.body.userID;
  const desc = req.body.desc;

  // Check if user ID and description already exist in tbl_proof_of_payment
  const checkProofQuery = "SELECT * FROM tbl_proof_of_payment WHERE account_info_id = ? AND description = 'Monthly Session'";
  connection.query(checkProofQuery, [userID, desc], (err, result) => {
    if (err) {
      console.log('Failed to check proof of payment', err);
      res.status(500).send('Failed to check proof of payment');
    } else {
      if (result.length > 0) {
        // User ID and description already exist
        res.sendStatus(400);
      } else {
        // Proceed with inserting the proof of payment
        const refNum = req.body.refNum;
        const amount = req.body.amount;
        const imageData = req.body.imageData;
        const currentDate = new Date().toISOString().slice(0, 10);
        const currentTime = new Date().toTimeString().slice(0, 8);
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const getFname = 'SELECT fname, email FROM tbl_account_info WHERE account_info_id = ?';
        connection.query(getFname, [userID], (err, fnameResult) => {
          if (err) {
            console.log('Failed to get first name', err);
            res.status(500).send('Failed to get first name');
          } else {
            const fname = fnameResult[0].fname;
            const email = fnameResult[0].email;
            const addProof = 'INSERT INTO tbl_proof_of_payment (account_info_id, email, name, description, reference_number, amount, image, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'Pending\')';
            connection.query(
              addProof,
              [userID, email, fname, desc, refNum, amount, buffer, currentDate, currentTime],
              (err, proofResult) => {
                if (err) {
                  console.log('Failed to insert proof of payment', err);
                  res.status(500).send('Failed to insert proof of payment');
                } else {
                  const insertedId = proofResult.insertId;
                  res.send({ insertedId });
                }
              }
            );
          }
        });
      }
    }
  });
});


app.get('/gcash', (req, res) => {
  const getGcashData = `select proof_of_payment_id, account_info_id, email, description, name, reference_number, amount, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, image, status from tbl_proof_of_payment order by proof_of_payment_id desc`;
  connection.query(getGcashData, (err, result) => {
    if(err){
      console.log('Failed to fetch proof of payment', err);
    }
    else{
      res.send(result);
    }
  });
});

app.get('/customer-payment-history', (req, res) => {
  const accID = req.query.accID;
  const getGcashData = `select proof_of_payment_id, account_info_id, email, name, reference_number, amount, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, image, status from tbl_proof_of_payment where account_info_id = ?`;
  connection.query(getGcashData, [accID], (err, result) => {
    if(err){
      console.log('Failed to fetch proof of payment', err);
    }
    else{
      res.send(result);
    }
  });
});

// app.post('/add-membership', (req, res) => {
//   const accID = req.body.accID;
//   const proofID = req.body.proofID;
//   const amount = req.body.amount;
//   const membershipType = req.body.membershipType;
//   const referenceNumber = req.body.referenceNumber;
//   const currentDate = new Date();
//   const startDate = currentDate.toISOString().slice(0, 10);
//   currentDate.setMonth(currentDate.getMonth() + 1);
//   const endDate = currentDate.toISOString().slice(0, 10);
//   const currentTime = new Date().toTimeString().slice(0, 8);

//   const getAccountInfo = `select * from tbl_account_info where account_info_id = '${accID}'`;
//   connection.query(getAccountInfo, (err, accountInfoResult) => {
//     if(err){
//       console.log('Failed to get account info', err);
//     }else{
//       const fname = accountInfoResult[0].fname + " " + accountInfoResult[0].lname;
//       const accName = accountInfoResult[0].fname;
//       const email = accountInfoResult[0].email;
//       // const name = fname + lname;
//       const insertMembership = `insert into tbl_membership (account_info_id, name, email, membership_type, amount, start_date, end_date, date, time, status, qrcode) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', '')`;
//       connection.query(insertMembership, [accID, fname, email, membershipType, amount, startDate, endDate, startDate, currentTime], (err, insertMembershipResult) => {
//         if(err){
//           console.log('Failed to add membership', err);
//         }else{
//           const membershipId = insertMembershipResult.insertId;

//           const formattedStartDate = moment(startDate).format('MMMM DD, YYYY');
//           const formattedEndDate = moment(endDate).format('MMMM DD, YYYY');
//           const qrCodeText = `Membership ID: ${membershipId}\nName: ${fname}\nMembership Type: ${membershipType}\nStart Date: ${formattedStartDate}\nEnd Date: ${formattedEndDate}`;

//           qrcode.toDataURL(qrCodeText, (err, qrCodeDataUrl) => {
//             if (err) {
//               console.log('Failed to generate QR code', err);
//               // Handle error
//             } else {
//               // Insert the QR code data into tbl_membership
//               const base64Data = qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, '');
//               const buffer = Buffer.from(base64Data, 'base64');
            
//               const updateMembership = `UPDATE tbl_membership SET qrcode = ? WHERE membership_id = ?`;
//               connection.query(updateMembership, [buffer, membershipId], (err, updateMembershipResult) => {
//                 if (err) {
//                   console.log('Failed to update membership with QR code', err);
//                   // Handle error
//                 } else {
//                   // QR code generated and inserted successfully
//                   // res.sendStatus(200);
//                   const updatePayment = `update tbl_proof_of_payment set status = 'Activated' where proof_of_payment_id = ?`;
//                   connection.query(updatePayment, [proofID], (err, paymentResult) => {
//                     if(err){
//                       console.log('Failed to update payment', err);
//                     } else {
//                       const insertNotification = `INSERT INTO tbl_notification (account_info_id, description, date, time, status) VALUES (?, ?, ?, ?, 'Unread')`;
//                       connection.query(
//                         insertNotification,
//                         [accID, `${accName}, Your payment has been confirmed. Ref No. ${referenceNumber}`, startDate, currentTime],
//                         (err, notificationResult) => {
//                           if (err) {
//                             console.log('Failed to insert notification', err);
//                           } else {
//                             res.sendStatus(200);
//                           }
//                         }
//                       );
//                     }
//                   });
//                   // res.sendStatus(200);
//                 }
//               });
//             }
//           });
//         }
//       });
//     }
//   });
// });
app.post('/add-membership', (req, res) => {
  const accID = req.body.accID;
  const proofID = req.body.proofID;
  const amount = req.body.amount;
  const membershipType = req.body.membershipType;
  const referenceNumber = req.body.referenceNumber;
  const currentDate = new Date();
  const startDate = currentDate.toISOString().slice(0, 10);
  currentDate.setMonth(currentDate.getMonth() + 1);
  const endDate = currentDate.toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 8);

  // Check if the user already has a membership of the same type
  const checkExistingMembership = `SELECT membership_id FROM tbl_membership WHERE account_info_id = ? AND membership_type = ?`;
  connection.query(checkExistingMembership, [accID, membershipType], (err, existingMembershipResult) => {
    if (err) {
      console.log('Failed to check existing membership', err);
      res.sendStatus(500);
      return;
    }

    if (existingMembershipResult.length > 0) {
      // User already has a membership of the same type, handle the error or provide appropriate response
      res.status(400).send('User already has a membership of the same type.');
      return;
    }

    // Proceed with adding the new membership
    const getAccountInfo = `SELECT * FROM tbl_account_info WHERE account_info_id = ?`;
    connection.query(getAccountInfo, [accID], (err, accountInfoResult) => {
      if (err) {
        console.log('Failed to get account info', err);
        res.sendStatus(500);
        return;
      }

      const fname = accountInfoResult[0].fname + " " + accountInfoResult[0].lname;
      const accName = accountInfoResult[0].fname;
      const email = accountInfoResult[0].email;

      const insertMembership = `INSERT INTO tbl_membership (account_info_id, name, email, membership_type, amount, start_date, end_date, date, time, status, qrcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', '')`;
      connection.query(insertMembership, [accID, fname, email, membershipType, amount, startDate, endDate, startDate, currentTime], (err, insertMembershipResult) => {
        if (err) {
          console.log('Failed to add membership', err);
          res.sendStatus(500);
          return;
        }

        const membershipId = insertMembershipResult.insertId;
        const formattedStartDate = moment(startDate).format('MMMM DD, YYYY');
        const formattedEndDate = moment(endDate).format('MMMM DD, YYYY');
        const qrCodeText = `Membership ID: ${membershipId}\nName: ${fname}\nMembership Type: ${membershipType}\nStart Date: ${formattedStartDate}\nEnd Date: ${formattedEndDate}`;

        qrcode.toDataURL(qrCodeText, (err, qrCodeDataUrl) => {
          if (err) {
            console.log('Failed to generate QR code', err);
            // Handle error
            res.sendStatus(500);
            return;
          }

          // Insert the QR code data into tbl_membership
          const base64Data = qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const updateMembership = `UPDATE tbl_membership SET qrcode = ? WHERE membership_id = ?`;
          connection.query(updateMembership, [buffer, membershipId], (err, updateMembershipResult) => {
            if (err) {
              console.log('Failed to update membership with QR code', err);
              // Handle error
              res.sendStatus(500);
              return;
            }

            // QR code generated and inserted successfully
            const updatePayment = `UPDATE tbl_proof_of_payment SET status = 'Confirmed' WHERE proof_of_payment_id = ?`;
            connection.query(updatePayment, [proofID], (err, paymentResult) => {
              if (err) {
                console.log('Failed to update payment', err);
                res.sendStatus(500);
                return;
              }
              else {
                const payment = `Reference Number: ${referenceNumber}`;
                const insertSales = `insert into tbl_sales_report (description, total, date, time, category) values ('${payment}', '${amount}', '${startDate}', '${currentTime}', 'Membership')`;
                connection.query(insertSales, (err, insertSalesResult) => {
                  if(err){
                    console.log('Failed to add sales workout', err);
                  }
                  else{
                    const insertNotification = `INSERT INTO tbl_notification (account_info_id, description, date, time, status) VALUES (?, ?, ?, ?, 'Unread')`;
                    connection.query(insertNotification, [accID, `${accName}, Your payment has been confirmed. Ref No. ${referenceNumber}`, startDate, currentTime], (err, notificationResult) => {
                      if (err) {
                        console.log('Failed to insert notification', err);
                        res.sendStatus(500);
                        return;
                      }
                      res.sendStatus(200);
                    });
                  }
                });
              }
            });
          });
        });
      });
    });
  });
});


app.get('/membership', (req, res) => {
  const fetchMembershipData = `select membership_id, account_info_id, name, email, membership_type, amount, DATE_FORMAT(start_date, '%M %d, %Y') as start_date, DATE_FORMAT(end_date, '%M %d, %Y') as end_date, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, status, qrcode from tbl_membership`;
  connection.query(fetchMembershipData, (err, result) => {
    if (err) {
      console.log('Failed to fetch membership data', err);
    } else {
      // console.log(result[0].qrcode);
      res.send(result);
    }
  });
});

app.get('/notification', (req, res) => {
  const accID = req.query.accID;
  const fetchNotifData = `select notification_id, account_info_id, description, DATE_FORMAT(date, '%M %d, %Y') as date, DATE_FORMAT(time, '%h:%i:%s %p') as time, status from tbl_notification where account_info_id = ? order by notification_id desc`;
  connection.query(fetchNotifData, [accID], (err, result) => {
    if (err) {
      console.log('Failed to fetch notif data', err);
    } else {
      res.send(result);
    }
  })
});

app.get('/unread-notif', (req, res) => {
  const accID = req.query.accID;
  const fetchUnreadNotif = `select count(*) as count from tbl_notification where status = 'Unread' and account_info_id = ?`;
  connection.query(fetchUnreadNotif, [accID], (err, result) => {
    if (err) {
      console.log('Failed to get unread notifications count', err);
      res.status(500).send('Failed to get unread notifications count');
    } else {
      const count = result[0].count;
      res.json({ count });
    }
  });
});

app.put('/update-notif', (req, res) => {
  const accID = req.body.accID;
  const updateNotif = `update tbl_notification set status = 'Read' where account_info_id = ?`;
  connection.query(updateNotif, [accID], (err, result) => {
    if (err) {
      console.log('Failed to update notif', err);
    } else {
      res.send(result);
    }
  });
});

app.put('/access', (req, res) => {
  const accID = req.body.accID;
  const dashboard = req.body.dashboard;
  const reservation = req.body.reservation;
  const window = req.body.window;
  const sales = req.body.sales;
  const settings = req.body.settings;
  const userAccount = req.body.userAccount;
  const audit = req.body.audit;
  const attendance = req.body.attendance;
  const health = req.body.health;
  const announcement = req.body.announcement;

  const addRole = `update tbl_modules set dashboard = ?, reservation = ?, window_payment = ?, sales_report = ?, settings = ?, user_account = ?, audit_trail = ?, attendance_log = ?, health_guide = ?, announcement = ? where account_info_id = ?`;
  connection.query(addRole, [dashboard, reservation, window, sales, settings, userAccount, audit, attendance, health, announcement, accID], (err, result) => {
    if (err) {
      console.log('Failed to add role', err);
      //res.status(300).send('Failed to add role', err);
    } else {
      res.send(result);
    }
  });
});

app.get('/modules', (req, res) => {
  const accID = req.query.accID;
  const accessModule = 'select * from tbl_modules where account_info_id = ?';
  connection.query(accessModule, [accID], (err, result) => {
    if (err) {
      console.log('Failed to fetch access module', err);
    } else {
      res.status(200).send(result);
    }
  });
});

app.get('/fetch-qr-code', (req, res) => {
  const accID = req.query.accID;
  const fetchQR = `select qrcode, name from tbl_membership where account_info_id = ?`;
  connection.query(fetchQR, [accID], (err, result) => {
    if (err) {
      console.log('Failed to fetch qr code', err);
    } else {
      res.send(result);
    }
  });
});

// app.put('/customer-service', (req, res) => {
//   const customerID = req.body.customerID;
//   const newPword = req.body.newPword;
//   const confirmPword = req.body.confirmPword;
//   const email = req.body.email;
//   bcrypt.hash(newPword, 10, (err, hashNewPword) => {
//     if (err) {
//       console.log("Error hashing new password:", err);
//       res.sendStatus(500);
//       return;
//     }

//     bcrypt.hash(confirmPword, 10, (err, hashConfirmPword) => {
//       if (err) {
//         console.log("Error hashing confirm password:", err);
//         res.sendStatus(500);
//         return;
//       }

//       // Update the password in tbl_account_info and tbl_accounts
//       const updatePassQuery = "UPDATE tbl_account_info SET pword = ?, cpword = ? WHERE account_info_id = ?";
//       connection.query(updatePassQuery, [hashNewPword, hashConfirmPword, customerID], (err, result) => {
//         if (err) {
//           console.log("Error updating password:", err);
//           res.sendStatus(500);
//           return;
//         }

//         const updateAccountPassQuery = "UPDATE tbl_accounts SET password = ? WHERE account_id = ?";
//         connection.query(updateAccountPassQuery, [hashNewPword, customerID], (err, result) => {
//           if (err) {
//             console.log("Error updating account password:", err);
//             res.sendStatus(500);
//             return;
//           }

//           res.sendStatus(200);
//         });
//       });
//     });
//   });
// });

app.post('/add-customer-service', (req, res) => {
  const email = req.body.email;
  const contact = req.body.contact;
  const currentDate = new Date().toISOString().slice(0, 10);

  const checkEmailQuery = "SELECT * FROM tbl_accounts JOIN tbl_account_info ON tbl_accounts.account_id = tbl_account_info.account_info_id WHERE tbl_accounts.email = ?";
  connection.query(checkEmailQuery, [email], (err, result) => {
    if (err) {
      console.log("Error checking email:", err);
      res.sendStatus(500);
      return;
    }

    if (result.length === 0) {
      // Email does not exist
      res.status(400).json({ message: "Email not found." });
      return;
    }

    const checkCustomerServiceQuery = "SELECT * FROM tbl_customer_service WHERE email = ?";
    connection.query(checkCustomerServiceQuery, [email], (err, serviceResult) => {
      if (err) {
        console.log("Error checking customer service:", err);
        res.sendStatus(500);
        return;
      }

      if (serviceResult.length > 0) {
        // Email already exists in tbl_customer_service
        res.status(400).json({ message: "Email already exists in customer service." });
        return;
      }

      const addCustomerServiceQuery = "INSERT INTO tbl_customer_service (email, contact_no, date, status) VALUES (?, ?, ?, 'Pending')";
      const addCustomerServiceValues = [email, contact, currentDate];

      connection.query(addCustomerServiceQuery, addCustomerServiceValues, (err, addResult) => {
        if (err) {
          console.log('Failed to add customer service', err);
          res.sendStatus(500);
          return;
        }

        res.send(addResult);
      });
    });
  });
});

app.get('/customer-service', (req, res) => {
  const customerService = `select customer_service_id, email, contact_no, DATE_FORMAT(date, '%M %d, %Y') as date, status from tbl_customer_service`;
  connection.query(customerService, (err, result) => {
    if (err) {
      console.log('Failed to fetch customer service', err);
    } else {
      res.send(result);
    }
  });
});


app.put('/update-customer-service', (req, res) => {
  const customerID = req.body.customerID;
  const newPword = req.body.newPword;
  const confirmPword = req.body.confirmPword;
  const email = req.body.email;

  // Check if the email exists in both tables
  const checkEmailQuery = "SELECT * FROM tbl_accounts JOIN tbl_account_info ON tbl_accounts.account_id = tbl_account_info.account_info_id WHERE tbl_accounts.email = ?";
  connection.query(checkEmailQuery, [email], (err, result) => {
    if (err) {
      console.log("Error checking email:", err);
      res.sendStatus(500);
      return;
    }

    if (result.length === 0) {
      // Email does not exist
      res.status(400).json({ message: "Email not found." });
      return;
    }

    // Email exists, proceed with updating the password
    bcrypt.hash(newPword, 10, (err, hashNewPword) => {
      if (err) {
        console.log("Error hashing new password:", err);
        res.sendStatus(500);
        return;
      }

      bcrypt.hash(confirmPword, 10, (err, hashConfirmPword) => {
        if (err) {
          console.log("Error hashing confirm password:", err);
          res.sendStatus(500);
          return;
        }

        // Update the password in tbl_account_info and tbl_accounts
        const updatePassQuery = "UPDATE tbl_account_info SET pword = ?, cpword = ? WHERE account_info_id = ?";
        connection.query(updatePassQuery, [hashNewPword, hashConfirmPword, customerID], (err, result) => {
          if (err) {
            console.log("Error updating password:", err);
            res.sendStatus(500);
            return;
          }

          const updateAccountPassQuery = "UPDATE tbl_accounts SET password = ? WHERE account_id = ?";
          connection.query(updateAccountPassQuery, [hashNewPword, customerID], (err, result) => {
            if (err) {
              console.log("Error updating account password:", err);
              res.sendStatus(500);
              return;
            }

            res.sendStatus(200);
          });
        });
      });
    });
  });
});



const autoInsertData = () => {
  const currentDate = new Date();
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(currentDate.getDate() + 5);

  const endDateCondition = fiveDaysFromNow.toISOString().slice(0, 10);

  const insertQuery = `INSERT INTO tbl_notification (account_info_id, description, date, time) SELECT account_info_id, 'Membership ending soon', CURDATE(), CURTIME() FROM tbl_membership WHERE end_date < '${endDateCondition}'`;

  connection.query(insertQuery, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
    } else {
      console.log('Data inserted successfully:', result.affectedRows, 'rows inserted.');
    }
  });
};

// Run the auto-insert function periodically (e.g., every day)
setInterval(autoInsertData, 24 * 60 * 60 * 1000); // Run once every 24 hours

const autoUpdateData = () => {
  const currentDate = new Date();
  const endDateCondition = currentDate.toISOString().slice(0, 10);

  const updateQuery = `UPDATE tbl_membership SET status = 'Expired' WHERE end_date = '${endDateCondition}'`;

  connection.query(updateQuery, (err, result) => {
    if (err) {
      console.error('Error updating data:', err);
    } else {
      console.log('Data updated successfully:', result.affectedRows, 'rows updated.');
    }
  });
};

// Run the auto-update function once every day
setInterval(autoUpdateData, 24 * 60 * 60 * 1000);


// app.put('update-customer-pass', (req, res) => {
//   const newPass = req.body.newPass;
//   const confirmNewPass = req.body.confirmNewPass;
//   const customerEmail = req.body.customerEmail;
  
//   const checkEmail = `select * from tbl_account_info where email = ?`;
//   connection.query(checkEmail, [customerEmail], (err, result) => {
//     if (err) {
//       console.log('Failed to check email', err);
//     } else {
//       const updatePassword = `update tbl_account_info set pword = ?, cpword = ? where email = ?`;
//       connection.query(updatePassword, [newPass, confirmNewPass, customerEmail], (err, accountInfoResult1) => {
//         if (err) {
//           console.log('Failed to update customer password', err);
//         } else {
//           const updateAccountPassword = `update tbl_accounts set password = ?`;
//           connection.query(updateAccountPassword, [newPass], (err, accountResult) => {
//             if (err) {
//               console.log('Failed to update customer password.', err);
//             } else {
//               res.send(result);
//             }
//           });
//         }
//       });
//     }
//   });
// });

app.put('/update-customer-pass', (req, res) => {
  const newPass = req.body.newPass;
  const confirmNewPass = req.body.confirmNewPass;
  const customerEmail = req.body.customerEmail;
  
  const checkEmail = `SELECT * FROM tbl_accounts WHERE email = ?`;
  connection.query(checkEmail, [customerEmail], (err, result) => {
    if (err) {
      console.log('Failed to check email', err);
      // Handle the error appropriately
      res.status(500).send('Failed to check email');
    } else {
      if (result.length > 0) {
        const accountId = result[0].account_id; // Retrieve the account_id from the result

        bcrypt.hash(newPass, 10, (err, hashedPassword) => {
          if (err) {
            console.log('Failed to hash the new password', err);
            // Handle the error appropriately
            res.status(500).send('Failed to hash the new password');
          } else {
            const updatePassword = `UPDATE tbl_account_info SET pword = ?, cpword = ? WHERE account_info_id = ?`;
            connection.query(updatePassword, [hashedPassword, hashedPassword, accountId], (err, accountInfoResult1) => {
              if (err) {
                console.log('Failed to update customer password', err);
                // Handle the error appropriately
                res.status(500).send('Failed to update customer password');
              } else {
                const updateAccountPassword = `UPDATE tbl_accounts SET password = ? WHERE account_id = ?`;
                connection.query(updateAccountPassword, [hashedPassword, accountId], (err, accountResult) => {
                  if (err) {
                    console.log('Failed to update customer password', err);
                    // Handle the error appropriately
                    res.status(500).send('Failed to update customer password');
                  } else {
                    res.send(result);
                  }
                });
              }
            });
          }
        });
      } else {
        // No matching email found
        res.status(404).send('Email not found');
      }
    }
  });
});



// app.use(express.static(path.join(__dirname, 'build')));

// // Serve the index.html file for all other requests
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`${apiUrl}`);
});

module.exports = connection;