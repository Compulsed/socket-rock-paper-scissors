/*
    Stores all of the application logic and variables

    Bugs
        Doesn't deal with disconnects properly
        Client side must follow a certain order or it wont work correctly

*/

// var chatServer;
var socketio = require('socket.io');
var io;
var events = require('events').EventEmitter;

var users = {};
var usedNickNames = [];
var que = [];
var playing = [];

setInterval(function(){
    // console.log("Checking que");

    // This really is ugly
    if(que.length >= 2){
        console.log("2 People are in the que, attempting to make a game");
        var challenger1 = que.shift();
        var challenger2 = que.shift();

        users[challenger1['socket.id']].setOpponent(challenger2['socket.id']);
        users[challenger2['socket.id']].setOpponent(challenger1['socket.id']);

        challenger2['socket'].emit('foundGame', {'name': {'you': users[challenger2['socket.id']].nickName, 'vs' : users[challenger1['socket.id']].nickName}});
        challenger1['socket'].emit('foundGame', {'name': {'you': users[challenger1['socket.id']].nickName, 'vs' : users[challenger2['socket.id']].nickName}});

        playing.push({'challenger1' : challenger1, 'challenger2': challenger2});
    }
}, 1000);

setInterval(function(){
    if(playing.length >= 1){
        var playerObj = playing[0];
        var challenger1 = playerObj['challenger1'];
        var challenger2 = playerObj['challenger2'];

        var item1 = users[challenger1['socket.id']].returnItemSelection();
        var item2 = users[challenger2['socket.id']].returnItemSelection();

        console.log("%s: %s, %s: %s", users[challenger1['socket.id']].nickName, item1, users[challenger2['socket.id']].nickName, item2);


        if(item1 != null && item2 != null){
            if(doesLeftBeatRight(item1, item2) === 0){
                console.log("TIE");
                challenger1['socket'].emit('result', {'status' : 'tie'});
                challenger2['socket'].emit('result', {'status' : 'tie'});
            }

            if(doesLeftBeatRight(item1, item2) === 1){
                console.log("Player 1 wins!")
                challenger1['socket'].emit('result', {'status' : 'win'});
                challenger2['socket'].emit('result', {'status' : 'lose'});
            }

            if(doesLeftBeatRight(item1, item2) === -1){
                console.log("Player 2 wins!");
                challenger1['socket'].emit('result', {'status' : 'lose'});
                challenger2['socket'].emit('result', {'status' : 'win'});
            }

            playing.shift();
            users[challenger1['socket.id']].finishGame();
            users[challenger2['socket.id']].finishGame();

            setTimeout(function(){
               console.log("Sending finish");

               challenger1['socket'].emit('finish', {});
               challenger2['socket'].emit('finish', {});
            }, 5000);

        } else {
            // console.log("No one has made a choice, moving to the back of playing que");
            var temp = playing[0];
            playing[0] = playing[playing.length - 1];
            playing[playing.length - 1] = temp;
        }
    }

}, 1000);


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

function handleAddingNickNames(socket){
    socket.on('addUsername', function (sentUsername) {
        if(!isInArray(sentUsername.username, usedNickNames)){
            usedNickNames.push(sentUsername.username);
            users[socket.id] = new User(socket.id, sentUsername.username, false);

            socket.emit('nameAttempt', {'added' : true});
        } else {
            socket.emit('nameAttempt', {'added' : false, 'reason' : 'Username already exists'});
        }

    });
}

function handleGameFindAttempt(socket){
    socket.on('attemptToFindGame', function(){

        var found = false;
        for(var i = 0; i < que.length; ++i){
            if(que[i]['socket.id'] === socket.id){
                found = true;
                break;
            }
        }

        if(!found)
            que.push({'socket.id' : socket.id, 'socket' : socket});
        else
            console.log("User is already in the que: ", users[socket.id].nickName);
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

function User(socketId, nickName, areTheyPlaying, socketOfWhoTheyArePlayingWith){
    this.socketId = socketId;
    this.nickName = nickName;
    this.playing = areTheyPlaying;
    this.opponent = null;

    this.itemSelection = null;

    if(this.playing)
        this.opponent = socketOfWhoTheyArePlayingWith;

    this.finishGame = function finishGame(){
        this.playing = false;
        this.opponent = null;
        this.itemSelection = null;
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
}
