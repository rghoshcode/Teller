
let balance = require(__dirname + "/balance-intent.js");
let purchases = require(__dirname + "/purchases-intent.js")
let Intent = require(__dirname + "/intent-model.js");
let creds = require(__dirname + "/credentials-intent.js");
let budget = require(__dirname + "/budget-intent.js")

let smalltalk = require(__dirname + "/smalltalk-intent.js");


let intents = {
    "check-balance": balance.checkBalance,
    "smalltalk": smalltalk.smalltalk,
    "logout": creds.logOut,
    "login": creds.logIn,
    "view-transactions": purchases.checkPurchases,
    "create-budget": budget.createBudget
};

function handleIntent(intent){
    if (intent instanceof Intent){

        //this is the action that we have recieved and we can then pass it on to the correct method
        var action = intent.messageData.result.action;

        //change smalltalk to all types of smalltalk because we can just let api.ai handle it
        if (action.substr(0,9) === "smalltalk") {
            action = "smalltalk"
        }

        if (typeof intents[action] === "function" ){
            intents[action](intent)
        }else{
            throw new Error("There was no matching intent with the given action.");
        }

    }else{
        throw new Error("The given parameter was not an Intent.")
    }
}

module.exports = {
    handleIntent: handleIntent
};