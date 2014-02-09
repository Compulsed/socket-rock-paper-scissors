/*
    Stores all of the application logic and variables

    Notes
        - Code needs cleaning up, especially the que loops and play loops.
        - Instead of loops there would be events, because a lot of redundant code is ran
          and it only runs every second (1 game per sec)

    Bugs
        - Doesn't deal with disconnects properly
        - Client side must follow a certain order or it wont work correctly
        - Should send an error back from the server to say that you're qued
        - It should time the game out if one person disconnects
        - (FIXED) It doesn't time the game out if someone doesn't pick an option (FIXED)

    Server                    ||   Client
    -------------------------------------------------------------------


    Assigning a username      ||
    -------------------------------------------------------------------
    handleAddingNickNames     <-   emit|AddUsername(theUsername)|
    emit|nameAttempt(added)|  ->   nameAttempt




    Attempt to find a game    ||
    -------------------------------------------------------------------
    handleGameFindAttempts    <-   emit|attemptToFindGame()|
    emit|foundGame(oppName)|  ->   handleGameAttempt



    Get response from players ||
    -------------------------------------------------------------------
                              <-   emit|itemSelected(item)| P1
    handleUserSelection       <-   ---------------------------
                              <-   emit|itemSelected(item)| P2

                               ->   handleWinLoss P1
                             /
    emit|handleResult(win)|-|
                             \
                               ->   handleWinLoss P2

    -------------------------------------------------------------------



*/

// var chatServer;
var socketio = require('socket.io');
var io;
var events = require('events').EventEmitter;

var users = {};
var usedNickNames = [];
var userQueue = [];
var playing = [];


exports.listen = function(server) { // Extends the server as an IO socket
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        console.log("Someone has connected, socket.id: %s has been given to them.", socket.id);

        handleAddingNickNames(socket);
        handleGameFindAttempt(socket);
        handleUserSelection(socket);
        //handleClientDisconnect(socket);
    });
};

// Que checker
setInterval(function(){
    console.log("Checking que, length is:" + userQueue.length);

    // This really is ugly
    if(userQueue.length >= 2){
        console.log("2 People are in the que, attempting to make a game");
        var socketIdPlayer1 = userQueue.shift();
        var socketIdPlayer2 = userQueue.shift();

        var player1 = users[socketIdPlayer1];
        var player2 = users[socketIdPlayer2];

        player1.setOpponent(socketIdPlayer2);
        player2.setOpponent(socketIdPlayer1);

        player1.returnPlayerSocket().emit('foundGame', {'name': {'you': player1.nickName, 'vs' : player2.nickName}});
        player2.returnPlayerSocket().emit('foundGame', {'name': {'you': player2.nickName, 'vs' : player1.nickName}});

        playing.push({'challenger1' : socketIdPlayer1, 'challenger2': socketIdPlayer2});
    }
}, 1000);



// Play checker
setInterval(function(){
    if(playing.length >= 1){
        var playerSocketIdObj = playing[0];
        var challenger1 = users[playerSocketIdObj['challenger1']];
        var challenger2 = users[playerSocketIdObj['challenger2']];

        var item1 = challenger1.returnItemSelection();
        var item2 = challenger2.returnItemSelection();

        console.log("%s: %s, %s: %s", challenger1.nickName, item1, challenger2.nickName, item2);


        if (challenger1.isTimeoutTimerActive === false){
            challenger1.isTimeoutTimerActive = true;

            challenger1.timeoutTimer = setTimeout(function(){
                console.log("Sending timeout to p1");
                challenger1.finishGame();

                challenger1.returnPlayerSocket().emit('finish');
                playing.shift();
            }, 10000);

            item1 = null;
        }

        if (challenger2.isTimeoutTimerActive === false){
            challenger2.isTimeoutTimerActive = true;

            challenger2.timeoutTimer = setTimeout(function(){
                console.log("Sending timeout to p2");

                challenger2.finishGame();
                challenger2.returnPlayerSocket().emit('finish');
            }, 10000);

            item2 = null;
        }

        // If both users have selected their choice, also removes them from the que
        if(item1 != null && item2 != null){

            if(doesLeftBeatRight(item1, item2) === 0){
                console.log("TIE");
                challenger1.returnPlayerSocket().emit('result', {'status' : 'tie'});
                challenger2.returnPlayerSocket().emit('result', {'status' : 'tie'});
            }

            if(doesLeftBeatRight(item1, item2) === 1){
                console.log("Player 1 wins!")
                challenger1.returnPlayerSocket().emit('result', {'status' : 'win'});
                challenger2.returnPlayerSocket().emit('result', {'status' : 'lose'});
            }

            if(doesLeftBeatRight(item1, item2) === -1){
                console.log("Player 2 wins!");
                challenger1.returnPlayerSocket().emit('result', {'status' : 'lose'});
                challenger2.returnPlayerSocket().emit('result', {'status' : 'win'});
            }


            playing.shift();
            challenger1.finishGame();
            challenger2.finishGame();

            setTimeout(function(){
               console.log("Sending finish");

               challenger1.returnPlayerSocket().emit('finish');
               challenger2.returnPlayerSocket().emit('finish');
            }, 5000);


        } else {
            console.log("No one has made a choice, moving to the back of playing que");

            // Move the person to the end of the que
            var temp = playing[0];
            playing[0] = playing[playing.length - 1];
            playing[playing.length - 1] = temp;
        }

    }

}, 1000);


function handleGameFindAttempt(socket){
    socket.on('attemptToFindGame', function(){
        if(!isInArray(socket.id, userQueue)){
            userQueue.push(socket.id);
        }
        else
            console.log("User is already in the que: ", users[socket.id].nickName);
    });
}

function handleAddingNickNames(socket){
    socket.on('addUsername', function (sentUsername) {
        if(!isInArray(sentUsername.username, usedNickNames)){
            usedNickNames.push(sentUsername.username);
            users[socket.id] = new User(socket.id, socket, sentUsername.username, false);

            socket.emit('nameAttempt', {'added' : true});
        } else {
            socket.emit('nameAttempt', {'added' : false, 'reason' : 'Username already exists'});
        }

    });
}

function handleUserSelection(socket){
    socket.on('itemSelected', function (item) {

        console.log(users[socket.id].nickName + " has selected " + item.item);
        users[socket.id].setSelection(item.item);

    });
}

// Seems to be triggered when the window is closed
function handleClientDisconnect(socket) {
    socket.on('disconnect', function(){
        var nickNameOfSocket = users[socket.id].nickName
        var nameIndex = usedNickNames.indexOf(nickNameOfSocket);
        delete usedNickNames[nameIndex];
        delete users[socket.id];

        console.log('Client with socket id: %s disconnected and nickname: %s', socket.id, nickNameOfSocket);
    });
}


function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

// 1:  left wins
// -1: right wins
// 0: tie
function doesLeftBeatRight(left, right){
    if(left === 'rock'){
        if(right === 'paper')    return -1;
        if(right === 'scissors') return 1;
    }

    if(left === 'paper'){
        if(right === 'scissors') return -1;
        if(right === 'rock')     return 1;
    }

    if(left === 'scissors'){
        if(right === 'rock')    return -1;
        if(right === 'paper')   return 1;
    }

    return 0;
}

function User(socketId, playerSocket, nickName, areTheyPlaying, socketIdOfWhoTheyArePlayingWith){
    this.socketId = socketId;           // The users socketId
    this.playerSocket = playerSocket    // The users actual socket

    this.nickName = nickName;           // The nick name the user has given themselves
    this.playing = areTheyPlaying;      // If the user is playing a game
    this.opponent = null;               // The socketId of the opponent
    this.itemSelection = null;          // What the user has select (rock, paper or scissors)

    this.isTimeoutTimerActive = false;  // If there is a timeout active (30 second games)
    this.timeoutTimer = null;           // The link to the timer for early termination


    if(this.playing)
        this.opponent = socketIdOfWhoTheyArePlayingWith;

    this.finishGame = function finishGame(){
        this.playing = false;
        this.opponent = null;
        this.itemSelection = null;

        if( this.isTimeoutTimerActive === true ){
            clearTimeout(this.timeoutTimer);
            this.isTimeoutTimerActive = false;
        }
    };

    this.isPlaying = function isPlaying(){
        return this.playing;
    };

    this.setOpponent = function setOpponent(socketOfOpponent){
        this.opponent = socketOfOpponent;
        this.itemSelection = null;
        this.playing = true;
    };

    this.setSelection = function setSelection(item){
        this.itemSelection = item;
    }

    this.returnItemSelection = function returnItemSelection(){
        return this.itemSelection;
    }

    this.returnPlayerSocket = function returnPlayerSocket(){
        return this.playerSocket;
    }
}
