var express = require('express');

var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var io = require('socket.io')(http);







http.listen(3000, function(){
  console.log('listening on *:3000');




});

app.use(express.static(__dirname));


app.get('/test', function(req, res){

  res.sendfile('mic.html');
});










io.on('connection', function(socket){
  console.log('a user connected');


  var net = require('net');

  var HOST = '127.0.0.1';
  var PORT = 50005;

  var client = new net.Socket();





  socket.on('conn', function(data){
    console.log("connect");
  client.connect(PORT, HOST, function() {

      console.log('CONNECTED TO: ' + HOST + ':' + PORT);
      socket.emit("start","ss");

  }
)});


  client.on('data', function(data) {

      console.log('DATA: ' + data);
      socket.emit("melodie",''+data);
      client.destroy();

  });

  client.on('close', function() {
      console.log('Connection closed');
  });






    socket.on('data', function(message) {
  //   console.log(message);

    client.write(message);






        //fs.writeFile('helloworld.wav', message, function (err) {
          //  if (err)
            //    return console.log(err);
            //console.log("test");
        //});


    });



});
