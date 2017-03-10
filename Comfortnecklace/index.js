"use strict";
var noble = require('noble'),
rfduino = require('./necklaceSettings'),
_ = require('underscore');
var fs = require('fs');
var THREE = require("three-js")();
var spawn = require("child_process").spawn;
var exec = require('child_process').exec;
var PythonShell = require('python-shell');
var proc = spawn('python',["genFeatures.py"]);
//var stats = require('stats-lite');
var jstat = require('jStat').jStat;
//python_launched_from_nodejs.py
var description = "";
var visualizeOn = false;
var extraBits = {
    "cal" : 0,
    "neg" : 0
}
var predictLabel = "";
var leanForwardAngle = -1;
var lastCountWritten = 0;
var flag = true;
var receiveCharacteristic;
var prev2secstart = 0;
var currTime = 0;
var timenow = Date();
var botdata = [];
var topdata = [];
var label = 0;
//===================================================================================
// argument line parser
// usage: node index.js --des andrey --visualize
var argv = require('minimist')(process.argv.slice(2));
console.dir(argv);

var allowedKeys = {'_': true, 'des': true, 'visualize': true}
var numKeysGiven = 0;
for (var key in argv) {
    console.log(key)
    if (!(key in allowedKeys)) {
        throw new Error('Invalid argument.')
    }
    numKeysGiven++;
}

if ('des' in argv) {
    description = argv['des'] + '_';
}

if ('visualize' in argv) {
    visualizeOn = true;
    // start express server for visualization
    var express = require('express')
    var app     = express();
    var http    = require('http').Server(app);
    var io      = require('socket.io').listen(http);

    app.use('/', express.static(__dirname + '/public'));
    http.listen(3000, function() {
        console.log('go to localhost:3000');
    });
}

var csvfile = 'data/' +  timenow.toLocaleString() + '.csv';
csvfile = csvfile.replace(/ /g, "_") // replace space by underscores, avoid hidden file in some OSes

function readFloatBitWise(buffer, bitPos) {
    // Read 23-bit starting from bitPos
    // Append 9 least significant bit of 0
    // Parse as a IEEE 32-bit float number
    let bytePos = Math.floor(bitPos / 8);
    let integer = buffer.readInt32LE(bytePos);

    let logicAnd = 0x7FFFFF;
    let offset = bitPos % 8;
    let leftShift = 9;
    // if (bitPos == 135) {
    //     offset++;
    //     logicAnd = 0x3FFFFF;
    //     leftShift = 10;
    // }
    integer = ((integer >>> offset) & logicAnd) << leftShift;
    if (bitPos == 112){
        var str1 = '';
        for (var i=19;i>15;i--){
            str1 = str1 + Array(9 - dec2bin(buffer[i]).length).join('0') + dec2bin(buffer[i]);
        }
        var integer1 = (parseInt(str1, 2) & 0x7F) << 16;
        var str2 = '';
        for (var j=15;j>11;j--){
            str2 = str2 + Array(9 - dec2bin(buffer[j]).length).join('0') + dec2bin(buffer[j]);
        }
        var integer2 = parseInt(str2, 2) >>> 16;
        integer = (integer1 + integer2) << 9;
        let buf = Buffer.alloc(4);
        buf.writeInt32LE(integer);
        return buf.readFloatLE();
    }
    else if (bitPos == 135){
        var str = '';
        for (var i=19;i>15;i--){
            str = str + Array(9 - dec2bin(buffer[i]).length).join('0') + dec2bin(buffer[i]);
        }
        integer = ((parseInt(str, 2) >> 7) & 0x3FFFFF) << 10;
        extraBits["cal"] = (parseInt(str,2) >> 30) & 3;
        extraBits["neg"] = (parseInt(str,2) >> 29) & 1;
        let buf = Buffer.alloc(4);
        buf.writeInt32LE(integer);
        return buf.readFloatLE();
    }
    let buf = Buffer.alloc(4);
    buf.writeInt32LE(integer);
    return buf.readFloatLE();
    }

function dec2bin(dec){
    return (dec >>> 0).toString(2);
}

// ==================================================================================
// bluetooth callbacks

noble.on('scanStart', function() {
    console.log('Scan started');
    setTimeout(function() {
        noble.stopScanning();
    }, 15000);
});

noble.on('scanStop', function() {
    console.log('Scan stopped');
});

noble.on('discover', function(peripheral) {

    if (_.contains(peripheral.advertisement.serviceUuids, rfduino.serviceUUID)) {
        console.log('peripheral discovered (' + peripheral.id +
            ' with address <' + peripheral.address +  ', ' + peripheral.addressType + '>,' +
            ' connectable ' + peripheral.connectable + ',' +
            ' RSSI ' + peripheral.rssi + ':');

        console.log('RFduino is advertising \'' + rfduino.getAdvertisedServiceName(peripheral) + '\' service.');

        peripheral.on('connect', function() {
            peripheral.discoverServices();
        });

        peripheral.once('disconnect', function() {
            console.log('Disconnected');
            lastCountWritten = 0;
            noble.stopScanning();
            noble.startScanning();
        });

        peripheral.on('servicesDiscover', function(services) {
            console.log('servicesDiscover');
            var rfduinoService;
            for (var i = 0; i < services.length; i++) {
                if (services[i].uuid === rfduino.serviceUUID) {
                    rfduinoService = services[i];
                    break;
                }
            }

            if (!rfduinoService) {
                console.log('Couldn\'t find the RFduino service.');
                return;
            }

            console.log(description);

            rfduinoService.on('characteristicsDiscover', function(characteristics) {
                console.log('Discovered ' + characteristics.length + ' service characteristics');

                for (var i = 0; i < characteristics.length; i++) {
                    if (characteristics[i].uuid === rfduino.receiveCharacteristicUUID) {
                        receiveCharacteristic = characteristics[i];
                        break;
                    }
                }

                if (receiveCharacteristic) {
                    var count = 0;
                    receiveCharacteristic.on('read', function(data, isNotification) {

                        //console.log('Inside receiving');
                        // console.log(data);

                         var z_proximity = data.readUInt8(0)
                         var x_proximity = data.readUInt8(1)

                        var ioData = {
                            time:   Date.now(),
                            bottom: z_proximity,
                            top: x_proximity,
                            label: label
                        }
                        console.log(ioData)

                        if (visualizeOn) {
                            io.sockets.emit('data', ioData);
                        }
                        count++;
                        if (count == 1) {
                          prev2secstart = ioData.time;
                        }
                        // 0 - 2, 4-6, 8-10
                        if (count > lastCountWritten){
                            lastCountWritten = count;
                            currTime = ioData.time;
                            // fs.appendFile(csvfile, ioData.time + ',' + ioData.bottom + ',' + ioData.top +'\n', function(err){
                            //       if (err)
                            //         throw new Error(err);
                            // });
                            if (flag) {
                                botdata.push(ioData.bottom);
                                topdata.push(ioData.top);
                            }
                            if (currTime - prev2secstart >= 2000 && flag){                                
                                var features = genFeatures(botdata, topdata);
                                var options = {
                                    args: [features]
                                };
                                PythonShell.run('testing.py', options, function (err, results) {
                                    if (err) throw err;
                                    predictLabel = results[0];
                                    label = predictLabel;
                                    console.log("Based on the label, you are %j", predictLabel);
                                });
                                // var pyshell = new PythonShell('testing.py', options);
                                // pyshell.on('message', function (message) {
                                //   // received a message sent from the Python script (a simple "print" statement) 
                                //   console.log('print states: %j', message);
                                // });
                                botdata = [];
                                topdata = [];
                                prev2secstart = currTime;
                                flag = false;
                            } else if (currTime - prev2secstart >= 2000) {
                                prev2secstart = currTime;
                                flag = true;
                            }



                        }
                    });

                    receiveCharacteristic.notify(true);
                }
            });

            rfduinoService.discoverCharacteristics();

        });

        peripheral.connect();
    }
});

noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        noble.startScanning();
    } else {
        noble.stopScanning();
    }
});

function genFeatures(bdata, tdata){
  var bmean = jstat.mean(bdata);
  var tmean = jstat.mean(tdata);
  var bmedian = jstat.median(bdata);
  var tmedian = jstat.median(tdata);
  var bmax = jstat.max(bdata);
  var tmax = jstat.max(tdata);
  var bmin = jstat.min(bdata);
  var tmin = jstat.min(tdata);
  var bskew = jstat.skewness(bdata);
  var tskew = jstat.skewness(tdata);
  var bkurt = jstat.kurtosis(bdata);
  var tkurt = jstat.kurtosis(tdata);
  var bper1 = jstat.percentile(bdata, 0.25);
  var tper1 = jstat.percentile(tdata, 0.25);
  var bper2 = jstat.percentile(bdata, 0.75);
  var tper2 = jstat.percentile(tdata, 0.75);
  var birq = bper2 - bper1;
  var tirq = tper2 - tper1;
  var bstd = jstat.stdev(bdata);
  var tstd = jstat.stdev(tdata);
  var brange = bmax - bmin;
  var trange = tmax - tmin;
  var brms = Math.sqrt(jstat.sumsqrd(bdata) / bdata.length);
  var trms = Math.sqrt(jstat.sumsqrd(tdata) / tdata.length);
  var res = [];
  //b
  res.push(bmean);
  res.push(bmedian);
  res.push(bmax);
  res.push(bmin);
  res.push(bskew);
  res.push(brms);
  res.push(bkurt);
  res.push(bper1);
  res.push(bper2);
  res.push(birq);
  res.push(brange);
  res.push(bstd);
  //t
  res.push(tmean);
  res.push(tmedian);
  res.push(tmax);
  res.push(tmin);
  res.push(tskew);
  res.push(trms);
  res.push(tkurt);
  res.push(tper1);
  res.push(tper2);
  res.push(tirq);
  res.push(trange);
  res.push(tstd);
  return res;
}
