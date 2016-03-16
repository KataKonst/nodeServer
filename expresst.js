var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var io = require('socket.io')(http);







http.listen(2000, function(){
  console.log('listening on *:3000');




});

app.use(express.static(__dirname+"/music"));
app.use(express.static(__dirname+"/images"));
