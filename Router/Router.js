const express = require('express');
const router = express.Router();
const controller = require('../Controller/Controller');
const {
    upload_candidate_info, 
    upload_members_info,
    upload_candidate_count,

    get_members_info,
    get_candidates_info,
    get_candidates_max_count,

    update_vote,
    get_vote_records,
    get_vote_records_per_member,
    update_member_status,

    /**Create new voting date */
    create_new_voting_date,
    get_voting_transactions,
    get_candidates_info_per_position,
    close_vote_transaction,
    edit_vote_transaction,

    /**Login */
    login,
    register,
    change_password,
    reset_all_member_status,

    /**update candidate multirun status */
    update_candidate_multirun,
    update_candidate_multirun_false,
    post_vote_transaction,

    /**Reset */
    reset_vote_transaction,

    /**Get final posted votes */
    get_posted_vote_per_candidate,

    /**Upload Images */
    upload_images,

    /**Delete Images */
    delete_images,

    /**Insert or Update Signatory */
    insert_signatory,
    get_signatories
} = require('../Controller/Controller');

router.post('/upload_candidate_info', upload_candidate_info);

router.post('/upload_members_info', upload_members_info);

router.post('/upload_candidate_count', upload_candidate_count);

router.post('/create_new_voting_date', create_new_voting_date);

router.post('/login', login);

router.post('/reset_all_member_status', reset_all_member_status);

router.post('/register', register);

router.post('/reset_vote_transaction', reset_vote_transaction);

router.post('/change_password', change_password);

router.post('/upload_images', upload_images);

router.post('/insert_signatory', insert_signatory);


router.get('/get_members_info', get_members_info);

router.get('/get_candidates_info', get_candidates_info);

router.get('/get_candidates_max_count', get_candidates_max_count);

router.get('/get_vote_records', get_vote_records);

router.get('/get_vote_records_per_member', get_vote_records_per_member);

router.get('/get_voting_transactions', get_voting_transactions);

router.get('/get_candidates_info_per_position', get_candidates_info_per_position);

router.get('/get_posted_vote_per_candidate', get_posted_vote_per_candidate);

router.get('/get_signatories', get_signatories);


router.put('/update_vote', update_vote);

router.put('/update_candidate_multirun', update_candidate_multirun);

router.put('/update_candidate_multirun_false', update_candidate_multirun_false);

router.put('/update_member_status', update_member_status);

router.put('/close_vote_transaction', close_vote_transaction);

router.put('/edit_vote_transaction', edit_vote_transaction);

router.put('/post_vote_transaction', post_vote_transaction);

router.delete('/delete_images', delete_images);
module.exports = router;
