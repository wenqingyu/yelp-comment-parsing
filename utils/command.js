'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exec = exec;

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function exec(command) {
  return new Promise(function (resolve, reject) {
    var cmds = command.split(' ');
    var cmd = cmds.shift();
    var args = cmds;
    console.log(command);
    console.log(cmd);
    console.log(args);
    var cat = _child_process2.default.spawn(cmd, args);
    cat.stdout.on('data', function (data) {
      console.log(data.toString());
      resolve(data.toString());
    });

    cat.on('exit', function (err) {
      console.log(err);
      if (err === 0) {
        reject(err);
      }
    });
  });
}