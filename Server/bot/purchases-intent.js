let plaid = require('plaid');
let mysql = require('mysql');
let path = require('path');
var messenger = require(path.resolve("./app/controllers/messenger-controller.js"));
let undefsafe = require('undefsafe');
let shortid = require('shortid');
const url = require('url');
const querystring = require('querystring');
let bankAccountManager = require(__dirname + '/../app/controllers/bankAccountManager.js')



var pool  = mysql.createPool({
    connectionƒLimit : 6,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: 'teller_production_rds'
});

const plaidClient = new plaid.Client(
    process.env.PLAID_CLIENT_ID,
    process.env.PLAID_SECRET,
    process.env.PLAID_PUBLIC_KEY,
    plaid.environments.sandbox
);

// this intent sees what purchases the user has made. It should show a webview showing all of the purchases in a nice angular list
function checkPurchases(intent){

    if (intent.registered === false) {
        messenger.handleUnregisteredUser(intent.accountID);
    }else{

        bankAccountManager.getPlaidAccessToken(null, intent.accountID, function(tokenRes,tokenError) {

            let tokenRes_undefsafe = undefsafe(tokenRes, '');

            if (tokenError) throw tokenError;
            else if(tokenRes.length === 0 || tokenRes_undefsafe[0].plaid_private_ID === null){
                messenger.sendMessage(intent.accountID, 'There is no bank linked to this Teller account.', function(callback){
                    console.log("There is no bank linked to your account")
                })

                return;
            }

            let accessToken = tokenRes[0].plaid_private_ID;
            var startDate;
            var endDate;

            let params = undefsafe(intent.messageData.result.parameters, '');

            if (params['date']) {
                startDate = intent.messageData.result.parameters['date'];
                endDate = intent.messageData.result.parameters['date'];
            } else if (params['date-period']) {
                startDate = params['date-period'].substr(0, 10);
                endDate = params['date-period'].substr(11, 20);
            } else {
                let message = "There were no transactions for this date";
                messenger.sendMessage(intent.accountID, message, function (callback) {
                    console.log("Intent Completed: " + intent.messageData.result.action + " User: " +
                        intent.accountID + " Registered: " + intent.registered);
                });
                return;
            }

            plaidClient.getTransactions("access-sandbox-482a0022-3c4d-4e2c-85cb-cc71f9cc205d", startDate, endDate, {}, function (err, results) {

                if (err) {
                    if (err.error_code === 'ITEM_LOGIN_REQUIRED'){

                        messenger.sendRevalidateBankCreds(intent.accountID, function(){
                            console.log("Intent Completed: " + intent.messageData.result.action + " User: " +
                                intent.accountID + " Registered: " + intent.registered +
                                "Message: The user did not have valid bank credentials");
                        });

                    }else{

                        messenger.sendMessage(intent.accountID, "Sorry! There was an unknown error processing your request.", function (callback) {
                            console.log("Intent Completed: " + intent.messageData.result.action + " User: " + intent.accountID + " Registered: " + intent.registered + " Error: " + err.error_code);
                        });
                    }

                } else {

                    let total_transactions = undefsafe(results, 'total_transactions');
                    var message;

                    if (total_transactions > 0 || total_transactions !== undefined && total_transactions !== null) {

                        let token = shortid.generate();

                        message = "I found " + results.total_transactions + " transactions from this date.";

                        pool.query('INSERT INTO view_transaction_request (token, startDate, endDate, messengerID) VALUES (?, ?, ?, ?)', [token, startDate, endDate, intent.accountID], function (error, results, fields) {


                            var baseUrl;
                            if (process.env.NODE_ENV === "Dev") {
                                login = 'https://teller-development-frontend.ngrok.io';
                            } else {
                                login = 'https://tellerchatbot.com';
                            }

                            let query = querystring.stringify({token: token});

                            let url = login + '/viewtransactions' + '/?' + query;

                            messenger.sendLink(intent.accountID, message, url, 'Transactions', function () {

                            });
                        });

                        return;

                    } else {
                        message = "There were no transactions for this date";
                    }

                    messenger.sendMessage(intent.accountID, message, function (callback) {
                        console.log("Intent Completed: " + intent.messageData.result.action + " User: " + intent.accountID + " Registered: " + intent.registered);
                    });
                }
            });
        });
    }
}

module.exports = {
    checkPurchases: checkPurchases
};