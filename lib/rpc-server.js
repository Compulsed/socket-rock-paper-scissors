/*
    Stores all of the application logic and variables
*/

// var chatServer;
var socketio = require('socket.io');
var io;

var nickNames = {};
var usedNickNames = [];

var Users = {};

function User(socketId, nickName, areTheyPlaying, socketOfWhoTheyArePlayingWith){
    this.socketId = socketId;
    this.opponent = socketOfWhoTheyArePlayingWith;

    this.nickName = nickName;
    this.playing = areTheyPlaying;
}



exports.listen = function(server) { // Extends the server as an IO socket
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        console.log("Someone has connected, socket.id: %s has been given to them.", socket.id);

        // Attachs a username to nickNames object, with the socket.id key
        handleAddingNickNames(socket);
        handleUserSelection(socket);
        handleClientDisconnect(socket);
        handleGameFindAttempt(socket);
    });
};

function handleGameFindAttempt(socket){
    socket.on('attemptToFindGame', function(){
        socket.emit('foundGame', {'name': {'you': nickNames[socket.id], 'vs' : 'bob'}});

        console.log("Found game!");
    });
}

function handleUserSelection(socket){
    socket.on('itemSelected', function (item) {
        console.log(nickNames[socket.id] + " has selected " + item.item);
    });
}

function handleAddingNickNames(socket){
    socket.on('addUsername', function (sentUsername) {
        if(!isInArray(sentUsername.username, usedNickNames)){
            usedNickNames.push(sentUsername.username);
            nickNames[socket.id] = sentUsername.username;

            socket.emit('nameAttempt', {'added' : true});
        } else {
            socket.emit('nameAttempt', {'added' : false, 'reason' : 'Username already exists'});
        }

    });
}

// Seems to be triggered when the window is closed
function handleClientDisconnect(socket) {
    socket.on('disconnect', function(){
        var nameIndex = usedNickNames.indexOf(nickNames[socket.id]);
        delete usedNickNames[nameIndex];
        delete nickNames[socket.id];

        console.log('Client with socket id: %s disconnected', socket.id);
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