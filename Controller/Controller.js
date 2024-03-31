const connection = require('../Database/connection');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
// Define the path to the images folder
const imagesFolderPath = path.join(__dirname, '..', 'images');


/**===============multer logic===================== */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '..', 'images'); // Specify the directory for uploaded images
      // Check if the images directory exists, if not, create it
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // Save the file with its original name
    }
  });


  const upload = multer({ storage: storage }).array('images'); // Use multer middleware to handle file uploads


  /**===============multer logic===================== */

// Function to save image file to server
const saveImage = (candidate) => {
    const imageName = path.basename(candidate.Image_file);
    const targetFolder = path.join(__dirname, '..', 'images');;

    // Check if the images folder exists, if not, create it
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
        console.log('Images folder created');
    }

    const imagePath = path.join(targetFolder, imageName);

    // Read the image file
    fs.readFile(candidate.Image_file, (err, data) => {
        if (err) {
            console.error(`Error reading image file for ${candidate.Candidate_Name}: ${err}`);
            return;
        }

        // Write the image file to the server
        fs.writeFile(imagePath, data, (err) => {
            if (err) {
                console.error(`Error saving image file for ${candidate.Candidate_Name}: ${err}`);
                return;
            }
            console.log(`Image file saved for ${candidate.Candidate_Name}: ${imagePath}`);
        });
    });
    const splitPath = splitImagePath(imagePath);
    candidate.Image_file = splitPath.filename;
}
/**Function to upload candidates with images */
const upload_candidate_info = async (req, res) => {
        const candidates = req.body;
        try {
            candidates.forEach(candidate => {
                saveImage(candidate);
                insertCandidate(candidate);
            });
            res.send('Images uploaded and saved successfully');
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
}

/**Function to upload members */
const upload_members_info = async (req, res) => {
    const io = require('../server').io;
    const database = 'members';
    const members = req.body;

    try {
        const deleteQuery = `DELETE FROM ${database}`;
        await executeQuery(deleteQuery);

         // Reset auto-increment value to 1
         const resetAutoIncrementQuery = `ALTER TABLE ${database} AUTO_INCREMENT = 1`;
         await executeQuery(resetAutoIncrementQuery);

        for (let member of members) {
            const checkExistenceQuery = `SELECT * FROM ${database} WHERE Member_Id = ?`;
            const existingRecords = await executeQuery(checkExistenceQuery, [member.Member_Id]);

            if (existingRecords.length > 0) {
                continue; // Member already exists, skip to the next one
            }

            const newRecord = {
                Member_Id: member.Member_Id,
                Member_Name: member.Member_Name,
                OTP_Code: member.OTP_Code,
                Created_At: new Date(),
                Updated_At: new Date()
            };
            const insertQuery = `INSERT INTO ${database} SET ?`;
            await executeQuery(insertQuery, newRecord);
        }
        const selectQuery = `SELECT * FROM ${database}`;
        const membersInfoUpdate = await executeQuery(selectQuery);

        io.emit('updateMembersInfo', membersInfoUpdate);
        res.status(200).send("Members information uploaded successfully.");
    } catch (error) {
        console.error("Error uploading members information:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**Function to upload candidates max count*/
const upload_candidate_count = async (req, res) => {
    const database = 'maximum_candidates';
    const maxCandidates = req.body;

    try {
        for (let maxCandidate of maxCandidates) {
            const checkExistenceQuery = `SELECT * FROM ${database} WHERE Candidate_Position = ?`;
            const existingRecords = await executeQuery(checkExistenceQuery, [maxCandidate.Candidate_Position]);

            if (existingRecords.length > 0) {
                continue; // Member already exists, skip to the next one
            }

            const newRecord = {
                Candidate_Position: maxCandidate.Candidate_Position,
                Candidate_Count: maxCandidate.Candidate_Count,
                Created_At: new Date(),
                Updated_At: new Date()
            };
            const insertQuery = `INSERT INTO ${database} SET ?`;
            await executeQuery(insertQuery, newRecord);
        }

        res.status(200).send("Members information uploaded successfully.");
    } catch (error) {
        console.error("Error uploading members information:", error);
        res.status(500).send("Internal Server Error");
    }
};
const splitImagePath = (imagePath) => {
    const directory = path.dirname(imagePath); // Get the directory path
    const filename = path.basename(imagePath); // Get the filename with extension
    const extension = path.extname(imagePath); // Get the file extension

    return {
        directory: directory,
        filename: filename,
        extension: extension
    };
}

// Function to insert new candidate record
 const insertCandidate = async(candidate) => {
    const io = require('../server').io;
    const database = 'candidates';
    const cName = candidate.Candidate_Name;
    const cPosition = candidate.Candidate_Position;


    const deleteQuery = `DELETE FROM ${database}`;
    await executeQuery(deleteQuery);

     // Reset auto-increment value to 1
     const resetAutoIncrementQuery = `ALTER TABLE ${database} AUTO_INCREMENT = 1`;
     await executeQuery(resetAutoIncrementQuery);


    const checkExistenceQuery = `SELECT * FROM ${database} WHERE Candidate_Name = ? AND  Candidate_Position = ?`;
    const existingRecords = await executeQuery(checkExistenceQuery, [cName, cPosition]);

    if (existingRecords.length > 0) {
        return; // Candidate already exists, do nothing
    }

    const newRecord = {
        Candidate_Name: candidate.Candidate_Name,
        Candidate_Position: candidate.Candidate_Position,
        Image_File: candidate.Image_file,
        Vote_Count: 0,
        Is_Original: 'Original',
        Created_At: new Date(),
        Updated_At: new Date()
    };
    const insertQuery = `INSERT INTO ${database} SET ?`;
    await executeQuery(insertQuery, newRecord);

}

// Function to execute SQL queries
function executeQuery(query, values) {
    return new Promise((resolve, reject) => {
        connection.query(query, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

/**Get Members Info */
const get_members_info = async(req, res) => {
    console.log('get members info')
      const database = 'members';
      try {
          const query = `SELECT * FROM ${database}`;
          const results = await executeQuery(query);
          res.json(results);
      } catch (error) {
          console.error('Error:', error);
          res.status(500).send('An error occurred while retrieving the products.');
      }
};

/**Get Candidates Info */
const get_candidates_info = async(req, res) => {
    console.log('get members info')
      const database = 'candidates';
      try {
          const query = `SELECT * FROM ${database}`;
          const results = await executeQuery(query);
          res.json(results);
      } catch (error) {
          console.error('Error:', error);
          res.status(500).send('An error occurred while retrieving the products.');
      }
};

/**Get final posted vote per Candidates Info */
const get_posted_vote_per_candidate = async(req, res) => {
      const database = 'candidates';
      try {
          const query = `SELECT * FROM ${database}`;
          const results = await executeQuery(query);

          res.json(results);
      } catch (error) {
          console.error('Error:', error);
          res.status(500).send('An error occurred while retrieving the products.');
      }
};
/**Get Candidates Info  per position*/
const get_candidates_info_per_position = async(req, res) => {
    const {votePos} = req.query;
    console.log('get members info', votePos)
      const database = 'candidates';
      try {
          const query = `SELECT * FROM ${database} WHERE Candidate_Position = '${votePos}'`;
          const results = await executeQuery(query);
          res.json(results);
      } catch (error) {
          console.error('Error:', error);
          res.status(500).send('An error occurred while retrieving the products.');
      }
};

/**Get Candidates max count */
const get_candidates_max_count = async(req, res) => {
      const database = 'maximum_candidates';
      try {
          const query = `SELECT * FROM ${database}`;
          const results = await executeQuery(query);
          res.json(results);
      } catch (error) {
          console.error('Error:', error);
          res.status(500).send('An error occurred while retrieving the products.');
      }
};

/**Get signatories*/
const get_signatories = async(req, res) => {
    const database = 'signatories';
    try {
        const query = `SELECT * FROM ${database}`;
        const results = await executeQuery(query);
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};

/**Get vote records */
const get_vote_records = async(req, res) => {
    const database = 'vote_records';
    try {
        const query = `SELECT * FROM ${database}`;
        const results = await executeQuery(query);
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};

/**Get vote records per member*/
const get_vote_records_per_member = async(req, res) => {
    const {idVoter} = req.query;
    const database = 'vote_records';
    try {
        const query = `SELECT * FROM ${database} WHERE Voters_Id = '${idVoter}'`;
        const results = await executeQuery(query);
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};
/**Get vote transactions */
const get_voting_transactions = async(req, res) => {
    const database = 'voting_transaction';
    try {
        const query = `SELECT * FROM ${database} WHERE Voting_Status = 'Open'`;
        const results = await executeQuery(query);
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};


/**Get vote records */
const get_members_records = async(req, res) => {
    const database = 'vote_records';
    try {
        const query = `SELECT * FROM ${database}`;
        const results = await executeQuery(query);
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};
/**Update Vote */
// const update_vote = (req, res) => {
// 	// const io = require('../server').io;
// 	console.log('update time keeping')
// 	console.log(req.body)
// 	const updates = req.body;
// 	const database = 'candidates';
// 	if (!updates || !updates.length) {
// 		return res.status(400).json({ error: 'Invalid updates' });
// 	}
// 	const query = `UPDATE ${database} SET ? WHERE id = ?`;
// 	updates.forEach(update => {
// 		const { id, ...updateFields } = update;

// 		connection.query(query, [updateFields, id], (err, result) => {
// 			if (err) {
// 				console.error('Error updating record:', err);
// 			} else {
// 				console.log('Record updated successfully:', result);
// 				// Emit a Socket.io event to inform other users about the update
// 				// io.emit('recordUpdated', { id, updateFields });
// 			}
// 		});
// 	});

// 	return res.status(200).json({ message: 'Records updated successfully' });
// }
// const update_vote = async(req, res) => {
//     const io = require('../server').io;
//     console.log('update time keeping');
//     console.log(req.body);
//     const updates = req.body;
//     const database = 'candidates';
   
//     if (!updates || !updates.length) {
//         return res.status(400).json({ error: 'Invalid updates' });
//     }
//     const query = `UPDATE ${database} SET ? WHERE id = ?`;
//     updates.forEach(update => {
//         const { id, ...updateFields } = update;
//         // const results = await executeQuery(`SELECT * FROM ${database} where id = ${id}`);
//         // Format datetime strings
//         if (updateFields.Created_At) {
//             updateFields.Created_At = new Date(updateFields.Created_At).toISOString().slice(0, 19).replace('T', ' ');
//         }
//         if (updateFields.Updated_At) {
//             updateFields.Updated_At = new Date(updateFields.Updated_At).toISOString().slice(0, 19).replace('T', ' ');
//         }

//         connection.query(query, [updateFields, id], (err, result) => {
//             if (err) {
//                 console.error('Error updating record:', err);
//             } else {
//                 console.log('Record updated successfully:', result);
//                 // Fetch the updated record from the database
//                 const selectQuery = `SELECT * FROM ${database} WHERE id = ?`;
//                 connection.query(selectQuery, [id], (selectErr, selectResult) => {
//                     if (selectErr) {
//                         console.error('Error fetching updated record:', selectErr);
//                     } else {
//                         // Emit a Socket.io event to inform other users about the update
//                         io.emit('UpdatedVoteCount', selectResult[0]); // Assuming there's only one updated record
//                     }
//                 });
//             }
//         });
//     });

//     return res.status(200).json({ message: 'Records updated successfully' });
// };

const update_vote = async (req, res) => {
    const io = require('../server').io;
    
    console.log('asdasda',req.body);
    const updates = req.body;
    const uniqueID = [...new Set(updates.map(item => item.Voters_Id).filter(item => item !== null))];
    const database = 'candidates';
    const database2 = 'vote_records';
    const memberDatabase = 'members';
    const database3 = 'maximum_candidates';
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
 
    const VotersID = uniqueID[0];
    const VotersDuration = updates[0].Voting_Duration;
    console.log('VotersID',VotersID, currentTime);
    console.log('duration', updates[0].Voting_Duration);
    if (!updates || !updates.length) {
        return res.status(400).json({ error: 'Invalid updates' });
    }

    try {
        const insertedRecords = [];

        for (const update of updates) {
            const { id } = update;
            const selectQuery = `SELECT * FROM ${database} WHERE id = ?`;

            // Fetch the current record from the database
            const [candidate] = await new Promise((resolve, reject) => {
                connection.query(selectQuery, [id], (selectErr, result) => {
                    if (selectErr) {
                        console.error(`Error fetching candidate with ID ${id}:`, selectErr);
                        reject(selectErr);
                    } else if (!result.length) {
                        console.error(`Candidate with ID ${id} not found`);
                        reject(new Error(`Candidate with ID ${id} not found`));
                    } else {
                        resolve(result);
                    }
                });
            });

            const currentVoteCount = candidate.Vote_Count || 0;
            const newVoteCount = currentVoteCount + 1;

            const query = `UPDATE ${database} SET Vote_Count = ? WHERE id = ?`;

            // Update vote count for the candidate
            await new Promise((resolve, reject) => {
                connection.query(query, [newVoteCount, id], async (updateErr, _result) => {
                    if (updateErr) {
                        console.error(`Error updating vote count for candidate ${id}:`, updateErr);
                        reject(updateErr);
                    } else {
                        // console.log(`Vote count for candidate ${id} updated successfully`);

                        const { Voters_Id, Voters_Name, Candidate_Name, Candidate_Position, Voting_Duration, Image_File } = update;
                        // console.log(update)
                        const Vcount = 1;
                        // Insert the updated record into database2
                        const insertQuery = `INSERT INTO ${database2} (Voters_Id, Voters_Name, Candidate_Name, Candidate_Position, Voting_Duration, Image_File, Vote_Count, Created_At, Updated_At) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

                        connection.query(insertQuery, [Voters_Id, Voters_Name, Candidate_Name, Candidate_Position, Voting_Duration, Image_File, Vcount], (insertErr, _result) => {
                            if (insertErr) {
                                console.error(`Error inserting record into ${database2} for candidate ${id}:`, insertErr);
                                reject(insertErr);
                            } else {
                                console.log(`Record inserted into ${database2} for candidate ${id}`);
                                insertedRecords.push({ id, Vote_Count: newVoteCount });
                                resolve();
                            }
                        });
                    }
                });
            });
        }
        const queryUpdateMember = `UPDATE ${memberDatabase} SET Voting_Status = ?, Voting_Duration = ? WHERE Member_Id = ?`;

        // Update vote count for the candidate
        new Promise((resolve, reject) => {
            connection.query(queryUpdateMember, ['Done', VotersDuration, VotersID], async (updateErr, _result) => {
                if (updateErr) {
                    console.error(`Error updating voting status for member ${VotersID}:`, updateErr);
                    reject(updateErr);
                } else {
                    // Fetch the updated record from the member database
                    const selectUpdatedMemberQuery = `SELECT * FROM ${memberDatabase} WHERE Member_Id = ?`;
                    connection.query(selectUpdatedMemberQuery, [VotersID], (selectUpdatedMemberErr, updatedMemberResult) => {
                        if (selectUpdatedMemberErr) {
                            console.error(`Error fetching updated record for member ${VotersID}:`, selectUpdatedMemberErr);
                            reject(selectUpdatedMemberErr);
                        } else {
                            // Emit the updated record to the client
                            io.emit('UpdatedMemberRecord', updatedMemberResult[0]);
                            // console.log('updatedMemberResult', updatedMemberResult)
                            // Emit the inserted records to the client
                            io.emit('InsertedVoteRecords', insertedRecords);
                            resolve();
                        }
                    });
                }
            });
        }).catch(error => {
            // Handle any errors
            console.error('Error occurred:', error);
        });

     
        // Fetch all records from the database after updates
const selectAllQuery = `SELECT * FROM ${database} WHERE updated_at >= ?`;

// Fetch all records from the database
const [newRecord] = await Promise.all([
    new Promise((resolve, reject) => {
        connection.query(selectAllQuery, [currentTime], (err, result) => {
            if (err) {
                console.error('Error fetching updated records:', err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    })
]);

// Emit a Socket.io event to inform other users about the updates with all records
io.emit('UpdatedVoteCount',  {newRecord}     );

        // Emit a Socket.io event to inform other users about the update with all records
        // io.emit('UpdatedVoteCount', records);
        return res.status(200).json({ message: 'Records updated successfully', data: newRecord });
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
};


const update_member_status = async (req, res) => {
    const io = require('../server').io;

    console.log(req.body);
    const updates = req.body;
    const memberDatabase = 'members';
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const {memberID, memberStatus} = updates;

    // if (!updates || !updates.length) {
    //     console.log('error')
    //     return res.status(400).json({ error: 'Invalid updates' });
    // }

    try {
        const query = `UPDATE ${memberDatabase} SET Voting_Status = ? WHERE Member_Id = ?`;

        // Update vote count for the candidate
        await new Promise((resolve, reject) => {
            connection.query(query, [memberStatus, memberID], async (updateErr, _result) => {
                if (updateErr) {
                    console.error(`Error updating vote count for candidate ${memberID}:`, updateErr);
                    reject(updateErr);
                } else {
                    // console.log(`Vote count for candidate ${id} updated successfully`)
                    // Fetch the updated record from the member database
                    const selectUpdatedMemberQuery = `SELECT * FROM ${memberDatabase} WHERE Member_Id = ?`;
                    connection.query(selectUpdatedMemberQuery, [memberID], (selectUpdatedMemberErr, updatedMemberResult) => {
                        if (selectUpdatedMemberErr) {
                            console.error(`Error fetching updated record for member ${memberID}:`, selectUpdatedMemberErr);
                            reject(selectUpdatedMemberErr);
                        } else {
                            // Emit the updated record to the client
                            io.emit('UpdatedMemberRecord', updatedMemberResult[0]);
                            resolve();
                        }
                    });
                }
            });
        });


        // Emit a Socket.io event to inform other users about the update with all records
        // io.emit('UpdatedVoteCount', records);
        return res.status(200).json({ message: 'Records updated successfully'});
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
};
const update_candidate_multirun = async (req, res) => {
    const io = require('../server').io;

    console.log(req.body);
    const updates = req.body;
    const memberDatabase = 'candidates';
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const {positionMultiRun} = updates;
    console.log(updates);
    // if (!updates || !updates.length) {
    //     console.log('error')
    //     return res.status(400).json({ error: 'Invalid updates' });
    // }

    try {
        const query = `UPDATE ${memberDatabase} SET Is_Multi_Run = ? WHERE Candidate_Position = ?`;

        // Update vote count for the candidate
        await new Promise((resolve, reject) => {
            connection.query(query, ['Yes', positionMultiRun], async (updateErr, _result) => {
                if (updateErr) {
                    console.error(`Error updating vote count for candidate ${positionMultiRun}:`, updateErr);
                    reject(updateErr);
                } else {
                 resolve();
                }
            });
        });

        // Emit a Socket.io event to inform other users about the update with all records
        // io.emit('UpdatedVoteCount', records);
        return res.status(200).json({ message: 'Records updated successfully'});
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
};

const update_candidate_multirun_false = async (req, res) => {
    const io = require('../server').io;

    console.log(req.body);
    const updates = req.body;
    const memberDatabase = 'candidates';
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const {positionMultiRun} = updates;
    console.log(updates);
    // if (!updates || !updates.length) {
    //     console.log('error')
    //     return res.status(400).json({ error: 'Invalid updates' });
    // }

    try {

        const checkAllCandidatesMultiple = `SELECT * FROM ${memberDatabase} WHERE Is_Multi_Run = 'Yes' AND Candidate_Position = '${positionMultiRun}'`;
        const executeAllCandidatesMultiple = await executeQuery(checkAllCandidatesMultiple);

        if(executeAllCandidatesMultiple.length <= 0){
            res.status(500).json({ error: error.message });
        }

        console.log(executeAllCandidatesMultiple)
        const query = `UPDATE ${memberDatabase} SET Is_Multi_Run = ? WHERE Candidate_Position = ?`;

        // Update vote count for the candidate
        await new Promise((resolve, reject) => {
            connection.query(query, ['', positionMultiRun], async (updateErr, _result) => {
                if (updateErr) {
                    console.error(`Error updating vote count for candidate ${positionMultiRun}:`, updateErr);
                    reject(updateErr);
                } else {
                 resolve();
                }
            });
        });

        // Emit a Socket.io event to inform other users about the update with all records
        // io.emit('UpdatedVoteCount', records);
        return res.status(200).json({ message: 'Records updated successfully'});
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
};
/**Function to start vote */
const create_new_voting_date = async (req, res) => {
    const io = require('../server').io;

    const database = 'voting_transaction';
    const candidateDB = 'candidates';

    console.log('asdasdas', req.body)
    const {
        StartDate,
        StartTime,
        EndDate,
        EndTime,
        VotingPosition
      } = req.body;
    try {

        let checkExistenceQueryOpen;
        let checkExistenceQuery;
       
        let existingRecordsOpen;
        let existingRecords;

        if(VotingPosition === 'ALL'){
            checkExistenceQueryOpen = `SELECT * FROM ${database} WHERE Voting_Status = ?`;
            checkExistenceQuery = `SELECT * FROM ${database} WHERE Voting_Start_Date = ? AND Voting_Status = ?`;
          
            existingRecordsOpen = await executeQuery(checkExistenceQueryOpen,['Open']);
            existingRecords = await executeQuery(checkExistenceQuery, [StartDate, 'Open']);
        }else{
             checkExistenceQueryOpen = `SELECT * FROM ${database} WHERE Voting_Status = ? AND Voting_Position = ?`;
             checkExistenceQuery = `SELECT * FROM ${database} WHERE Voting_Start_Date = ? AND Voting_Status = ? AND Voting_Position = ?`;
           
             existingRecordsOpen = await executeQuery(checkExistenceQueryOpen,['Open', VotingPosition]);
             existingRecords = await executeQuery(checkExistenceQuery, [StartDate, 'Open', VotingPosition]);
    
        }
      
        if (existingRecordsOpen.length > 0) {
            console.log('Date already exists');
            return res.status(400).send("Error submitting, Please close the current Voting process before creating new transaction..."); // Sending error message to frontend
        }
        if (existingRecords.length > 0) {
            console.log('Date already exists');
            return res.status(400).send("Voting date already exists and open."); // Sending error message to frontend
        }

        const newRecord = {
            Voting_Position: VotingPosition,
            Voting_Start_Date: StartDate,
            Voting_Start_Time: StartTime,
            Voting_End_Date: EndDate,
            Voting_End_Time: EndTime,
            Voting_Status: 'Open',
            Created_At: new Date(),
            Updated_At: new Date()
        };

        const insertQuery = `INSERT INTO ${database} SET ?`;
        await executeQuery(insertQuery, newRecord);

        const insertedRecord = await executeQuery(`SELECT * FROM ${database} WHERE id = LAST_INSERT_ID()`);
        io.emit('OpenVotingTransactions', insertedRecord);



        let executecheckMultiplePosition = [];
        const insertedRecords = [];

        const updateAndInsertRecords = async (records) => {
            for (const record of records) {
                // Check if the record already exists in the database
                // const checkQuery = `SELECT COUNT(*) AS count FROM ${candidateDB} WHERE Candidate_Position = ? AND Candidate_Name = ?`;
                // const values = [record.Candidate_Position, record.Candidate_Name];
        
                try {
                  
        
                  
                        // Record doesn't exist, proceed with insertion
                        // Update values of Candidate_Position and Voting_Status
                        record.Candidate_Position = VotingPosition;
                        record.Voting_Status = '';
        
                        // Format Created_At and Updated_At datetime values
                        const createdAt = new Date(record.Created_At).toISOString().slice(0, 19).replace('T', ' ');
                        const updatedAt = new Date(record.Updated_At).toISOString().slice(0, 19).replace('T', ' ');
        
                        // Update the Created_At and Updated_At properties in the record
                        record.Created_At = createdAt;
                        record.Updated_At = updatedAt;
                        record.Vote_Count = 0;
                        record.Is_Original = '';
                        // Remove the id property from the record
                        delete record.id;

                    const checkQuery = `SELECT * FROM ${candidateDB} WHERE Candidate_Position = ? AND Candidate_Name = ?`;
                    const values = [record.Candidate_Position, record.Candidate_Name];

                    const results = await executeQuery(checkQuery, values);

                    if (results.length <= 0) {
                        // Insert the record into the database
                        const insertQuery = `INSERT INTO ${candidateDB} SET ?`;
                       try {
                           const insertResult = await executeQuery(insertQuery, record);
                           const insertedId = insertResult.insertId; // Retrieve the ID of the newly inserted record
                           console.log('Record inserted into the database with ID:', insertedId);

                           // Fetch the inserted record from the database
                           const selectQuery = `SELECT * FROM ${candidateDB} WHERE id = ?`;
                           const selectResult = await executeQuery(selectQuery, insertedId);
                           const insertedRecord = selectResult[0]; // Assuming only one record is returned
                           console.log('Record inserted into the database with ID:', insertedRecord);
                           insertedRecords.push(insertedRecord); // Push the fetched record into the array
                       } catch (error) {
                           console.error('Error inserting record into the database:', error);
                       }
                    } else {
                        // Record exists, skip insertion
                        console.log('Record already exists in the database. Skipping insertion:', record);
                    }
                } catch (error) {
                    console.error('Error checking if record exists:', error);
                }
            }
        };

        if(VotingPosition !== 'ALL'){
            const checkMultiplePosition = `SELECT * FROM ${candidateDB} WHERE Candidate_Position != ? AND Is_Multi_Run = ?`;
            executecheckMultiplePosition = await executeQuery(checkMultiplePosition,[VotingPosition, 'Yes']);

                if(executecheckMultiplePosition.length > 0){
                    console.log('There is other multiple position need to insert', executecheckMultiplePosition, VotingPosition);
                    // Extract unique records based on Candidate_Name
                    // Extract unique records based on Candidate_Name
                    const hasElectedRecord = executecheckMultiplePosition.filter(record => record.Voting_Status === 'Elected');

                    console.log('hasElectedRecord',hasElectedRecord)
                    if(hasElectedRecord.length > 0){
                        const remainingRecords = executecheckMultiplePosition.filter(record => {
                            // Check if the Candidate_Name of the current record is found in any record of hasElectedRecord
                            const foundInElected = hasElectedRecord.some(electedRecord => electedRecord.Candidate_Name === record.Candidate_Name);
                            
                            // Return true to keep the record if it's not found in hasElectedRecord, false otherwise
                            return !foundInElected;
                        });
                        
                        // console.log('Remaining records after removal:', remainingRecords.length, hasElectedRecord.length);
                        await updateAndInsertRecords(remainingRecords);
                     
                    }else{
                        const uniqueRecords = Array.from(new Set(executecheckMultiplePosition.map(record => JSON.stringify(record)))).map(JSON.parse);

                        await updateAndInsertRecords(uniqueRecords);
                     
                    }
                  
                }else{
                    console.log('no multiple position need to insert');
                    
                }
               
        }else{
            console.log('voting is for all');
        }
        //    // Query the database again to retrieve the newly inserted record
        // const getAllCandidates = `SELECT * FROM ${candidateDB}`;
        // const checkgetAllCandidatesQuery = await executeQuery(getAllCandidates);;

        io.emit('AdditionalCandidates', insertedRecords);
        res.status(200).send("Voting information uploaded successfully.");
    } catch (error) {
        console.error("Error uploading voting information:", error);
        res.status(500).send("Internal Server Error");
    }
};
/**funtion to update vote */
const close_vote_transaction = async (req, res) => {
    const io = require('../server').io;

    const votes = req.body.VoteTransactions[0];
    const voteDatabase = 'voting_transaction';
    const voteId = votes.id;
    console.log(votes)
    try {
        const query = `UPDATE ${voteDatabase} SET Voting_Status = ? WHERE id = ?`;

        // Update vote count for the candidate
        await new Promise((resolve, reject) => {
            connection.query(query, ['Closed', voteId], async (updateErr, _result) => {
                if (updateErr) {
                    console.error(`Error updating vote transation  ${voteId}:`, updateErr);
                    reject(updateErr);
                } else {
                    // // console.log(`Vote count for candidate ${id} updated successfully`)
                    // // Fetch the updated record from the member database
                    // const selectUpdatedMemberQuery = `SELECT * FROM ${voteDatabase} WHERE id = ?`;
                    // connection.query(selectUpdatedMemberQuery, [voteId], (selectUpdatedMemberErr, updatedMemberResult) => {
                    //     if (selectUpdatedMemberErr) {
                    //         console.error(`Error fetching updated voting transactions ${voteId}:`, selectUpdatedMemberErr);
                    //         reject(selectUpdatedMemberErr);
                    //     } else {
                    //         // Emit the updated record to the client
                            io.emit('CloseVotingTransactions',{message: 'no transaction'});
                            resolve();
                        // }
                    // });
                }
            });
        });


        // Emit a Socket.io event to inform other users about the update with all records
        // io.emit('UpdatedVoteCount', records);
        return res.status(200).json({ message: 'Records updated successfully'});
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
}
const edit_vote_transaction = async (req, res) => {
    const io = require('../server').io;

    const votes = req.body.VoteTransactions;
    const voteDatabase = 'voting_transaction';
    const voteId = votes.id;
    console.log(req.body)
    const  { Voting_End_Date,
    Voting_End_Time,
    Voting_Start_Date,
    Voting_Start_Time,
    Voting_Status,
    id} = votes
    newRecord = {
        Voting_End_Date: Voting_End_Date,
        Voting_End_Time: Voting_End_Time,
        Voting_Start_Date: Voting_Start_Date,
        Voting_Start_Time: Voting_Start_Time,
        Voting_Status: Voting_Status,
        Updated_At: new Date()
    }
    console.log(Voting_Status)
    try {
        const query = `UPDATE ${voteDatabase} SET ? WHERE id = ?`;

        // Update vote count for the candidate
        await new Promise((resolve, reject) => {
            connection.query(query, [newRecord, id], async (updateErr, _result) => {
                if (updateErr) {
                    console.error(`Error updating vote transation  ${id}:`, updateErr);
                    reject(updateErr);
                } else {
                    // console.log(`Vote count for candidate ${id} updated successfully`)
                    // Fetch the updated record from the member database
                    const selectUpdatedMemberQuery = `SELECT * FROM ${voteDatabase} WHERE id = ?`;
                    connection.query(selectUpdatedMemberQuery, [id], (selectUpdatedMemberErr, updatedMemberResult) => {
                        if (selectUpdatedMemberErr) {
                            console.error(`Error fetching updated voting transactions ${id}:`, selectUpdatedMemberErr);
                            reject(selectUpdatedMemberErr);
                        } else {
                            // Emit the updated record to the client
                            io.emit('OpenVotingTransactions',updatedMemberResult);
                            resolve();
                        }
                    });
                }
            });
        });


        // Emit a Socket.io event to inform other users about the update with all records
        // io.emit('UpdatedVoteCount', records);
        return res.status(200).json({ message: 'Records updated successfully'});
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
}

/**login */
/**Get vote transactions */
const login = async(req, res) => {
    const { username, password } = req.body;
    console.log( req.body)
    const database = 'users';
    try {
        const query = `SELECT * FROM ${database} WHERE Username = '${username}'`;
        const rows = await executeQuery(query, [username]);
        console.log( 'rows',rows)
        if (rows.length === 0) {
            // No user found with the provided username
            res.status(401).json({ success: false, message: 'Invalid username or password' });
            return;
        }
    
        // User found, compare passwords
        const user = rows[0];
        if (user.Password !== password) {
            // Passwords don't match
            res.status(401).json({ success: false, message: 'Invalid username or password' });
            return;
        }
    
        // Passwords match, return success response
        res.json({ success: true, message: 'Login successful', user: { id: user.id, username: user.Username } });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};

/**register */
const register = async(req, res) => {
    const { username, password, adminName } = req.body;
    console.log( req.body)
    const database = 'users';
    
    try {
        const query = `SELECT * FROM ${database} WHERE Username = '${username}'`;
        const existingUser = await executeQuery(query, [username]);

          // If the username already exists, return a 400 status code and an error message
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
    
        const newRecord ={
            Username: username,
            Password: password,
            Admin_Name: adminName,
            Created_At: new Date(),
            Updated_At: new Date()
        }
        const insertQuery = `INSERT INTO ${database} SET ?`;
        await executeQuery(insertQuery, newRecord);

        // Passwords match, return success response
        res.json({ success: true, message: 'Login successful'});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while retrieving the products.');
    }
};

/**register */
const change_password = async(req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    console.log( req.body)
    const database = 'users';
    
    try {
        const { username, oldPassword, newPassword } = req.body;
        const database = 'users';
        
        // Check if the username exists
        const query = `SELECT * FROM ${database} WHERE Username = ?`;
        const existingUser = await executeQuery(query, [username]);

        if (existingUser.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Check if the old password matches
        const user = existingUser[0];
        if (user.Password !== oldPassword) {
            return res.status(401).json({ error: 'Incorrect old password' });
        }

        // Update the password
        const updateQuery = `UPDATE ${database} SET Password = ? WHERE Username = ?`;
        await executeQuery(updateQuery, [newPassword, username]);

        // Send success response
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while changing the password.');
    }
};
/**Reset all member voting status */
const reset_all_member_status = async (req, res) => {
    const io = require('../server').io;

    console.log(req.body);
    const updates = req.body;
    const memberDatabase = 'members';
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    try {
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid updates' });
        }
    
        // Array to store promises for each update
        const updatePromises = [];
    
        // Iterate through each update
        updates.forEach(update => {
            const { Member_Id } = update;
            const memberStatus = '';
            const query = `UPDATE ${memberDatabase} SET Voting_Status = ? WHERE Member_Id = ?`;
    
            // Create a promise for each update
            const updatePromise = new Promise((resolve, reject) => {
                connection.query(query, [memberStatus, Member_Id], async (updateErr, _result) => {
                    if (updateErr) {
                        console.error(`Error updating vote count for member ${Member_Id}:`, updateErr);
                        reject(updateErr);
                    } else {
                        const selectUpdatedMemberQuery = `SELECT * FROM ${memberDatabase} WHERE Member_Id = ?`;
                        connection.query(selectUpdatedMemberQuery, [Member_Id], (selectUpdatedMemberErr, updatedMemberResult) => {
                            if (selectUpdatedMemberErr) {
                                console.error(`Error fetching updated record for member ${Member_Id}:`, selectUpdatedMemberErr);
                                reject(selectUpdatedMemberErr);
                            } else {
                                io.emit('UpdatedMemberRecord', updatedMemberResult[0]);
                                resolve();
                            }
                        });
                    }
                });
            });
    
            // Push the promise for this update into the array
            updatePromises.push(updatePromise);
        });
    
        // Wait for all updates to complete
        await Promise.all(updatePromises);
    
        return res.status(200).json({ message: 'Records updated successfully' });
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
};

/**Post Transaction */

const post_vote_transaction = async (req, res) => {
    const io = require('../server').io;

    const {UpdatedCandidates, EditVotingPos, EditStartDate, EditEndDate }= req.body;
    const updates = UpdatedCandidates;
    const candidatesDatabase = 'candidates';
    const voteTransactionDB = 'voting_transaction';
    console.log(req.body);
    try {
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid updates' });
        }
        /**Get all records, then return unique Positions */
        const checkTransactions = `SELECT * FROM ${voteTransactionDB} WHERE Voting_Position = ? AND Voting_Start_Date = ? AND Voting_End_Date = ?`;
        const executeCheckTransaction = await executeQuery(checkTransactions,[EditVotingPos, EditStartDate, EditEndDate]);

        // Create an array to store matching records
        const matchingRecords = [];

        // Assuming candidates is an array of candidate objects
        for (const candidate of updates) {
            const { id, Candidate_Position, Voting_Status } = candidate;
            const checkElected = `SELECT * FROM ${candidatesDatabase} WHERE id = ? AND Candidate_Position = ? AND Voting_Status = ?`;
            const executeCheckElected = await executeQuery(checkElected, [id, Candidate_Position, 'Elected']);

            // Check if any records were returned from the query
            if (executeCheckElected.length > 0) {
                // Record exists in the database based on the query
                // Push the matching record to the matchingRecords array
                matchingRecords.push(candidate);
                console.log(`Record for candidate ${id} in position ${Candidate_Position} and voting status ${Voting_Status} already exists in the database.`);
            } else {
                // Record does not exist in the database based on the query
                // Handle the case where the record does not exist
                console.log(`Record for candidate ${id} in position ${Candidate_Position} and voting status ${Voting_Status} does not exist in the database.`);
            }
        }

        // Outside the loop, you can use the matchingRecords array as needed
        console.log('Matching records:', matchingRecords);

        if(executeCheckTransaction.length <= 0){
            console.log('matching ',executeCheckTransaction)
            return res.status(400).json({message :'No matching vote transaction, please check Position and Date...'});
        }
        
        if(matchingRecords.length > 0){
            return res.status(400).json({message :'Failed : Transaction already posted...'});
        }
        // const uniquePositions = [...new Set(executeAllCandidates.map(item => item.Candidate_Position))];

        //  /**Get all candidate which is valid for Multi Run */
        //  const multiRunCandidates = `SELECT * FROM ${candidatesDatabase} WHERE Is_Multi_Run = ?`;
        //  const executeMultiRunCandidates = await executeQuery(multiRunCandidates,['Yes']);
   
        // Iterate through each update
        updates.forEach(update => {
            const { id, Candidate_Position } = update;
            const candidateStatus = 'Elected';
            const query = `UPDATE ${candidatesDatabase} SET Voting_Status = ? WHERE id = ? AND Candidate_Position = ?`;

            connection.query(query, [candidateStatus, id, Candidate_Position], async (updateErr, _result) => {
                if (updateErr) {
                    console.error('Error updating record:', updateErr);
                } else {
                      // Execute a query to fetch the updated record
                    const selectUpdatedRecordQuery = `SELECT * FROM ${candidatesDatabase} WHERE id = ?`;
                    connection.query(selectUpdatedRecordQuery, [id], (selectErr, updatedRecord) => {
                        if (selectErr) {
                            console.error('Error fetching updated record:', selectErr);
                        } else {
                            console.log('Updated record:', updatedRecord);
                        }
                    });
                }
            });
        });
    
        if(EditVotingPos === 'ALL'){
            // After the iteration, update records where Candidate_Position matches EditVotingPos and Voting_Status is ''
            const updateQuery = `UPDATE ${candidatesDatabase} SET Voting_Status = 'Done' WHERE Voting_Status = ''`;
            connection.query(updateQuery, [EditVotingPos], (updateErr, _result) => {
                if (updateErr) {
                    console.error('Error updating records:', updateErr);
                } else {
                    console.log(`Records where Candidate_Position equals ${EditVotingPos} and Voting_Status is '' have been updated to 'Done'.`);
                }
            });
        }else{
            // After the iteration, update records where Candidate_Position matches EditVotingPos and Voting_Status is ''
            const updateQuery = `UPDATE ${candidatesDatabase} SET Voting_Status = 'Done' WHERE Candidate_Position = ? AND (Voting_Status = '' OR Voting_Status IS NULL)`;
            connection.query(updateQuery, [EditVotingPos], (updateErr, _result) => {
                if (updateErr) {
                    console.error('Error updating records:', updateErr);
                } else {
                    console.log(`Records where Candidate_Position equals ${EditVotingPos} and Voting_Status is '' have been updated to 'Done'.`);
                }
            });
        }
        io.emit('UpdateRefreshCandidates',  {message:'Posted'} );
        // console.log('updatePromises' , updatePromises);
        return res.status(200).json({ message: 'Records updated successfully' });
    } catch (error) {
        console.error('Error updating vote count:', error);
        return res.status(500).json({ error: 'Error updating vote count' });
    }
};

/**Reset */
const reset_vote_transaction = async (req, res) => {
    const io = require('../server').io;

    const voteRecordsDB = 'vote_records';
    const candidatesDB = 'candidates';
    const memberDB = 'members';
    const votingTransactionsDB ='voting_transaction';
    try {

        // Delete all records from vote_recordsDB
        const deleteQueryVotingTrans = `DELETE FROM ${votingTransactionsDB}`;
        await executeQuery(deleteQueryVotingTrans);

        // Reset auto-increment value to 1
        const resetAutoIncrementQueryVotingTrans = `ALTER TABLE ${votingTransactionsDB} AUTO_INCREMENT = 1`;
        await executeQuery(resetAutoIncrementQueryVotingTrans);




        // Delete all records from vote_recordsDB
        const deleteQuery = `DELETE FROM ${voteRecordsDB}`;
        await executeQuery(deleteQuery);

        // Reset auto-increment value to 1
        const resetAutoIncrementQuery = `ALTER TABLE ${voteRecordsDB} AUTO_INCREMENT = 1`;
        await executeQuery(resetAutoIncrementQuery);

        // Update candidates table to reset Vote_Count to 0 and set Voting_Status to NULL
        const updateCandidatesQuery = `UPDATE ${candidatesDB} SET Vote_Count = 0, Voting_Status = NULL`;
        await executeQuery(updateCandidatesQuery);

        // Update member table to reset Voting_Duration to NULL and set Voting_Status to NULL
        const updateMembersQuery = `UPDATE ${memberDB} SET Voting_Duration = NULL, Voting_Status = NULL`;
        await executeQuery(updateMembersQuery);

        const deleteQueryVoteTrans = `DELETE FROM ${candidatesDB} WHERE Is_Original != 'Original'`;
        await executeQuery(deleteQueryVoteTrans);

        // Reset auto-increment value to 1
        const resetAutoIncrementQueryVoteTrans = `ALTER TABLE ${candidatesDB} AUTO_INCREMENT = 1`;
        await executeQuery(resetAutoIncrementQueryVoteTrans);

        const selectQuery = `SELECT * FROM ${candidatesDB}`;
        const selectUpdatedCandidate = await executeQuery(selectQuery);

        
        const selectQueryMembers = `SELECT * FROM ${memberDB}`;
        const selectUpdatedMembers = await executeQuery(selectQueryMembers);
        
        io.emit('UpdatedCandidate',  selectUpdatedCandidate );
        io.emit('updateMembersInfo',  selectUpdatedMembers );
        return res.status(200).json({ message: 'Vote records reset successfully' });
    } catch (error) {
        console.error('Error resetting vote transaction:', error);
        return res.status(500).json({ error: 'Error resetting vote transaction' });
    }
};


/**Upload Images */
const upload_images = async (req, res) => {
 try {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        console.error('Multer error:', err);
        return res.status(400).send('Error uploading images');
      } else if (err) {
        // An unknown error occurred
        console.error('Unknown error:', err);
        return res.status(500).send('Internal Server Error');
      }

      // File uploads were successful
      const uploadedFiles = req.files.map(file => file.filename);
      // Here you can process the uploaded files further, such as saving their filenames to the database
      // For example:
      // await uploadModel.saveUploadedImages(uploadedFiles);

      res.send('Images uploaded successfully...');
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).send('Internal Server Error');
  }

}


/**Delete Images */
const delete_images = async (req, res) => {
     // Function to delete all files in a directory
  fs.readdir(imagesFolderPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Iterate through each file in the directory
    files.forEach((file) => {
      // Construct the full path to the file
      const filePath = path.join(imagesFolderPath, file);

      // Delete the file
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          return res.status(500).send('Internal Server Error');
        }
        console.log('File deleted successfully:', filePath);
      });
    });

    res.send('All uploaded images deleted successfully');
  });
}



/**Insert or Update Signatory */
const insert_signatory = async (req, res) => {
    const io = require('../server').io;

    const signatoryDB = 'Signatories';
    console.log('signatory', req.body)

    const { signatoryName, signatoryPosition } = req.body;
     // Check if there's a record with the same signatoryPosition
     try {
         // Update the password
         const selectQuery = `SELECT * FROM ${signatoryDB} WHERE Signatory_Position = ?`;
         const existingSignatory = await executeQuery(selectQuery, [signatoryPosition]);
 
        
        if (existingSignatory.length > 0) {
            // Record with the same signatoryPosition already exists
            // return res.status(400).json({ message: 'A signatory with the same position already exists' });

             // Update the password
            const updateQuery = `UPDATE ${signatoryDB} SET Signatory_Name = ?, Updated_At = CURRENT_TIMESTAMP WHERE Signatory_Position = ?`;
            await executeQuery(updateQuery, [signatoryName, signatoryPosition]);
            res.status(200).json({ message: 'Signatory updated successfully' });
        }else{
            const insertQuery = `INSERT INTO ${signatoryDB} (Signatory_Name, Signatory_Position) VALUES (?, ?)`;
            await executeQuery(insertQuery, [signatoryName, signatoryPosition]);

            res.status(200).json({ message: 'Signatory inserted successfully' });
        }

        // Send a success response


    } catch (error) {
        console.error('Error inserting signatory:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

};

module.exports = {
    saveImage,
    insertCandidate,
    upload_candidate_info,
    upload_members_info,
    upload_candidate_count,

    get_members_info,
    get_candidates_info,
    get_candidates_info_per_position,
    get_candidates_max_count,

    update_vote,
    get_vote_records,
    get_vote_records_per_member,
    update_member_status,

  /**Create new voting date */
    create_new_voting_date,
    get_voting_transactions,
    close_vote_transaction,
    edit_vote_transaction,

    /**Login */
    login,
    register,
    change_password,
    reset_all_member_status,

    /**Update candidate multi run status*/
    update_candidate_multirun,
    update_candidate_multirun_false,
    post_vote_transaction,

    /**Reset */
    reset_vote_transaction,

    /**get final posted votes per candidate */
    get_posted_vote_per_candidate,

      /**Upload Images */
      upload_images,

        /**Delete Images */
    delete_images,

    
    /**Insert or Update Signatory */
    insert_signatory,
    get_signatories
}