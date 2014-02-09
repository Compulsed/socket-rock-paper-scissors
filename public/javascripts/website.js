var socket = io.connect();

var givenUserName = '';

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
        handleWinLoss(socket);
        handleFinish(socket);

        socket.emit('attemptToFindGame');
        $('#findGameButton').text("You've been put in a que!");
    });


    // Item clickers
    $('#rock').on('click', function(){
        socket.emit('itemSelected', {item: 'rock'});
        selection($(this), $('#paper'), $('#scissors'));
    });

    $('#paper').on('click', function(){
        socket.emit('itemSelected', {item: 'paper'});
        selection($(this), $('#rock'), $('#scissors'));
    });

    $('#scissors').on('click', function(){
        socket.emit('itemSelected', {item: 'scissors'});
        selection($(this), $('#paper'), $('#rock'));
    });


    // Socket check
    if(socket){
        console.log("Connected to server");
    } else {
        console.log("Not connected to server");
    }

});

// Adds selected to the first argument, removes it from the others
function selection(item1, item2, item3){
    item1.addClass('selected');
    item2.removeClass('selected');
    item3.removeClass('selected');
}

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

function handleWinLoss(socket){
    socket.on('result', function (status){
        var outputStatus = $('#winLoseResults');

        $('#statusRow').removeClass('hidden');

        if(status.status == 'win'){
            outputStatus.text('Congratulations, you won!');
        }

        if(status.status == 'lose') {
            outputStatus.text('You\' just lost!');
        }

        if(status.status == 'tie') {
            outputStatus.text('You tied, try again?');
        }

    });
}

function handleFinish(socket){
    socket.on('finish', function (){
        console.log("Finished, cleaned up!");

        // Cleans up rows
        $('#actionRow').addClass('hidden');
        $('#statusRow').addClass('hidden');
        $('#vsRow').addClass('hidden');

        // Allows the option to be put back in the que
        $('#findGame').removeClass('hidden');

        // Cleans up selected items
        $('#paper').removeClass('selected');
        $('#rock').removeClass('selected');
        $('#scissors').removeClass('selected');

        $('#findGameButton').text("Click to find a game!");
    });
}