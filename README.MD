// ==========================
// 📦 CANDIDATE PROCESSING
// ==========================
function processNewCandidatesFromRows(...) { ... }

// ==========================
// 📤 TEXT QUEUING & SENDING
// ==========================
function queueText(...) { ... }
function sendAllTexts(...) { ... }
function findSendTextRow(...) { ... }
function markTextedInGeorgeSheet(...) { ... }

// ==========================
// 🧠 LOGGING + HELPERS
// ==========================
function logError(...) { ... }
function logDetailedError(...) { ... }
function checkDailyDriverStats(...) { ... }


SendText - deletes row after sending text
sendRejectionText - adds the row, does checks then calls sendText



	•	onFormSubmit(e) is enabled and uses the live handleFormSubmission logic
	
    sendText()
    •	ensures row exists
    •	sends the correct message and deletes the row after success
	
    sendRejectionText() checks:
	•	Already sent?
	•	In pipeline?
	•	Not blacklisted?
	•	Appends row correctly
	•	Triggers sendText()




    /// need to make sure im updating candidate pipeline!!
    // pass text works when there is already one in pipeline
    // fail doesnt work
    


    // for texting - detect when a row gets added and delete it then



    CALENDLY
    1. Update code changes in VSCode
    2. clasp push (ensure this runs)
    3. update lastest deployment just to new version
    4. should work!





    1 lucid error
    2 updated failed statuses




    then i want to add them at the bottom of candidate pipeline to the right spot and delete from IBER SHEET






    TODO
    // get the dropdown for PENDING to populate for candidate pipeline
    //organize code some, to add more flags
    // function to take a row with errors = like no outreach, detect that and fix



    DEMO
    uploading, running prospects.testHandleNewProspects
    --> gets all the correct info into candidate pipeline (need to fix a few things like pending to be dropdown), sends text: reject, pass, blacklist
    ---> fills out form, also automates the text: reject, pass, blacklist


    2. STARTED on the scheduling stuff - the remit in particular but not done.

    3. more changes to master