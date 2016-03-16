!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.UserMediaRecorder=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			to[keys[i]] = from[keys[i]];
		}
	}

	return to;
};

},{}],2:[function(require,module,exports){
var UserMediaRecording = require("./user_media_recording");

var AudioContext = window.AudioContext || window.webkitAudioContext;
var cachedAudioContext = null;

function uuid() {
  var d = (window.performance && window.performance.now && window.performance.now()) ||
          (Date.now && Date.now()) ||
          new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
}

function UserMediaRecorder(stream, worker) {
  this.stream = stream;
  this.worker = worker;
}

UserMediaRecorder.prototype.startRecording = function(config) {
  cachedAudioContext = cachedAudioContext || new AudioContext();
  var recording = new UserMediaRecording(uuid(), this.stream, cachedAudioContext, this.worker, config);
  recording.startRecording();
  return recording;
};

UserMediaRecorder.prototype.stopRecording = function(recording, callback) {
  recording.stopRecording(callback);
};

module.exports = UserMediaRecorder;

},{"./user_media_recording":3}],3:[function(require,module,exports){
var assign = require("object-assign");

function UserMediaRecording(uuid, stream, audioContext, worker, config) {
  this.recording = false;
  this.uuid = uuid;
  this.stream = stream;
  this.audioContext = audioContext;
  this.worker = worker;
  this.config = assign({
    mono: false,
    bitrate: 128, // only used by mp3 encoder
    bufferSize: 4096,
  }, config || {});
  this.config.channels = this.config.mono ? 1 : 2;
  this.endRecordingCallback = function() {};
  this.type = "";

  this._onAudioProcess = this._onAudioProcess.bind(this);
}

UserMediaRecording.prototype.startRecording = function() {
  if (this.recording) {
    throw new Error("Already recording");
  }

  this.recording = true;

  var input = this.audioContext.createMediaStreamSource(this.stream);
  var node = input.context.createScriptProcessor(this.config.bufferSize, this.config.channels, this.config.channels);
  input.connect(node);
  node.connect(this.audioContext.destination);

  node.addEventListener("audioprocess", this._onAudioProcess);
  this.worker.addEventListener("message", this._handleWorkerMessage.bind(this));

  this.worker.postMessage({
    command: "init",
    uuid: this.uuid,
    config: {
      samplerate: this.audioContext.sampleRate,
      channels: this.config.channels,
      bitrate: this.config.bitrate
    }
  });
};

UserMediaRecording.prototype.stopRecording = function(callback) {
  if (!this.recording) {
    throw new Error("Not recording");
  }

  this.recording = false;
  this.endRecordingCallback = callback || this.endRecordingCallback;

  this.worker.postMessage({
    command: "end",
    uuid: this.uuid
  });
};

UserMediaRecording.prototype._onAudioProcess = function(evt) {
  var audioData = this._getAudioData(evt.inputBuffer);

  if (!this.recording) return;
  this.worker.postMessage({
    command: "encode",
    uuid: this.uuid,
    buffer: audioData
  });
};

UserMediaRecording.prototype._getAudioData = function(inputBuffer) {
  var channelLeft;
  if (this.stream.ended) return [];
  channelLeft = inputBuffer.getChannelData(0);
  // Clone buffer data so that it can't change under us.
  channelLeft = new Float32Array(channelLeft);
  return channelLeft;
};

UserMediaRecording.prototype._handleWorkerMessage = function(evt) {
  var data = evt.data
      uuid = data.uuid;

  if (uuid !== this.uuid) {
    return;
  }

  switch (data.command) {
  case "init":
    this.type = data.type;
    break;
  case "data":
    this.appendToBuffer(data.buffer);
    break;
  case "end":
    this.appendToBuffer(data.buffer);
    var view;
    try {
      view = new DataView(this.buffer);
      var blob = new Blob([view], {type: this.type});
      try {
        this.endRecordingCallback(blob);
      } catch(e) {
        // don't call back twice
        throw e;
      }
    } catch (e) {
      this.endRecordingCallback(null);
      throw e;
    }
    break;
  }
};

UserMediaRecording.prototype.appendToBuffer = function(buffer) {
  if (!this.buffer) {
    this.buffer = buffer;
  } else {
    var tmp = new Uint8Array(this.buffer.byteLength + buffer.byteLength);
    tmp.set(new Uint8Array(this.buffer), 0);
    tmp.set(new Uint8Array(buffer), this.buffer.byteLength);
    this.buffer = tmp.buffer;
  }
};

module.exports = UserMediaRecording;

},{"object-assign":1}]},{},[2])(2)
});