let request = require("request");
let mysql = require('mysql');

var pool  = mysql.createPool({
    connectionƒLimit : 6,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: 'teller_production_rds'
});

//should check the plaid database to make sure the user has an account
function verifyMessengerUser(userID, callback){
    pool.query('SELECT fullname, userID, facebookID FROM user WHERE facebookID=?', [userID], function(error, result, fields){
        if (error) throw error;
        else {
            if (result.length === 0){
                //this user has not yet registered with teller
                callback({
                    succeeded: false
                });
            }else{
                //there is a user here so we can let them continue.
                callback({
                    succeeded: true
                });
            }
        }
    });
}

function handleUnregisteredUser(userID){

    let message = "It looks like you aren't registered with Teller yet. Please visit \n" +
        "https://tellerchatbot.com to get started";

    sendMessage(userID, message, function(){

    });
}

function sendMessage(recipient, recipientmessage, callback){
    var options = {
        url: 'https://graph.facebook.com/v2.6/me/messages',
        method: "POST",
        qs: {access_token:process.env.FB_MESSENGER_TOKEN},
        json:{
            recipient: {
                id: recipient
            },
            message:{
                text: recipientmessage
            }
        }
    };

    request(options,function(error,incomingMessage,response){
        if (!error){
            if (callback){
                callback()
            }
        }
    });

}


module.exports = {
    sendMessage: sendMessage,
    verifyMessengerUser: verifyMessengerUser,
    handleUnregisteredUser: handleUnregisteredUser
};