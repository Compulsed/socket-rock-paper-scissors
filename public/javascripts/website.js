var socket = io.connect();

var givenUserName = '';
var selected = '';



$(document).ready(function(){

    // User name adding
    $('#submitUser').on('click', function(){
        var usernameInputField = $('#usernameInput');
        var usernameRow = $('#usernameRow');
        var findGameButton = $('#findGame');

        // If none given, assigns random name
        if( usernameInputField.val() !== '' ){
            givenUserName = usernameInputField.val();
        } else {
            givenUserName = 'Unknown' + Math.floor((Math.random()*1000)+1); // Should request server for free username
        }

        socket.emit('addUsername', {username: givenUserName});

        socket.on('nameAttempt', function(name){
            if(name.added){
                usernameRow.addClass('hidden');
                findGameButton.removeClass('hidden');
            } else {
                $('#usernameStatus').text(name.reason);
            }
        });
    });

    // Requests a game
    $('#findGameButton').on('click', function(){
        console.log("Find game button clicked!");
        handleGameAttempt(socket);
        socket.emit('attemptToFindGame');
    });



    // Item clickers
    $('#rock').on('click', function(){
        socket.emit('itemSelected', {item: 'rock'});
    });

    $('#paper').on('click', function(){
        socket.emit('itemSelected', {item: 'paper'});
    });

    $('#scissors').on('click', function(){
        socket.emit('itemSelected', {item: 'scissors'});
    });


    // Socket check
    if(socket){
        console.log("Connected to server");
    } else {
        console.log("Not connected to server");
    }

});

function handleGameAttempt(socket){
    socket.on('foundGame', function (names){
        console.log("Server found a game with: " + names.name.vs);

        $('#findGame').addClass('hidden');
        $('#actionRow').removeClass('hidden');
        $('#vsRow').removeClass('hidden');

        $('#nameOfOpponent').text(names.name.vs);
        $('#nameOfYou').text(names.name.you);
    });
}
