'use strict';
var debugReceive = false;

// MSP_codes needs to be re-integrated inside MSP object
var MSP_codes = {
    MSP_IDENT:              100,
    MSP_STATUS:             101,
    MSP_BOX:                113,
    MSP_MISC:               114,
    MSP_BOXNAMES:           116,
    MSP_PIDNAMES:           117,
    MSP_WP:                 118,
    MSP_BOXIDS:             119,
    
    MSP_FAULT:				120,
    MSP_CURRENT:			130,
    
    MSP_PERIOD_100:			141,
    MSP_PERIOD_50: 			142,
    MSP_PERIOD_25:			143,

    MSP_EEPROM_WRITE:       250,

    MSP_DEBUGMSG:           253,
    MSP_DEBUG:              254,

    // Additional baseflight commands that are not compatible with MultiWii
    MSP_UID:                160, // Unique device ID

    // Additional private MSP for baseflight configurator (yes thats us \o/)
    MSP_CONFIG:             66, // baseflight-specific settings that aren't covered elsewhere
    MSP_SET_CONFIG:         67, // baseflight-specific settings save
    MSP_SET_REBOOT:         68 // reboot settings
};

var MSP = {
    state:                      0,
    message_direction:          1,
    code:                       0,
    message_length_expected:    0,
    message_length_received:    0,
    message_buffer:             null,
    message_buffer_uint8_view:  null,
    message_checksum:           0,

    callbacks:                  [],
    packet_error:               0,

    read: function (readInfo) {
        var data = new Uint8Array(readInfo.data);

        for (var i = 0; i < data.length; i++) {
        	//console.log(data[i]);
        	
            switch (this.state) {
                case 0: // sync char 1
                    if (data[i] == 36) { // $
                        this.state++;
                    }
                    break;
                case 1: // sync char 2
                    if (data[i] == 77) { // M
                        this.state++;
                    } else { // restart and try again
                        this.state = 0;
                    }
                    break;
                case 2: // direction (should be >)
                    if (data[i] == 62) { // >
                        this.message_direction = 1;
                        if(debugReceive) console.log("SYNC GOOD!");
                    } else { // <
                        this.message_direction = 0;
                    }

                    this.state++;
                    break;
                case 3:
                    this.message_length_expected = data[i];

                    this.message_checksum = data[i];

                    // setup arraybuffer
                    this.message_buffer = new ArrayBuffer(this.message_length_expected);
                    this.message_buffer_uint8_view = new Uint8Array(this.message_buffer);

                    this.state++;
                    break;
                case 4:
                    this.code = data[i];
                    this.message_checksum ^= data[i];

                    if (this.message_length_expected > 0) {
                        // process payload
                        this.state++;
                        if(debugReceive) console.log("CODE GOOD! (" + this.code + ")");
                    } else {
                        // no payload
                        this.state += 2;
                    }
                    break;
                case 5: // payload
                    this.message_buffer_uint8_view[this.message_length_received] = data[i];
                    this.message_checksum ^= data[i];
                    this.message_length_received++;

                    if (this.message_length_received >= this.message_length_expected) {
                        this.state++;
                        
                        var printLoad = "";
                        
                        if(debugReceive) {
                        	for (var foo = 0; foo < this.message_buffer_uint8_view.length; foo++){
                        		printLoad += this.message_buffer_uint8_view[foo];
                        	}
                        	console.log("PAYLOAD GOOD! (" + printLoad + ")");
                        }
                    }
                    break;
                case 6:
                    if (this.message_checksum == data[i]) {
                        // message received, process
                        this.process_data(this.code, this.message_buffer, this.message_length_expected);
                        if(debugReceive) console.log("CHECKSUM GOOD!");
                    } else {
                        console.log('code: ' + this.code + ' - crc failed');

                        this.packet_error++;
                        $('span.packet-error').html(this.packet_error);
                    }

                    // Reset variables
                    this.message_length_received = 0;
                    this.state = 0;
                    break;

                default:
                    console.log('Unknown state detected: ' + this.state);
            }
        }
    },
    process_data: function (code, message_buffer, message_length) {
        var data = new DataView(message_buffer, 0); // DataView (allowing us to view arrayBuffer as struct/union)

        switch (code) {
            case MSP_codes.MSP_IDENT:
                CONFIG.version = parseFloat((data.getUint8(0) / 100).toFixed(2));
                CONFIG.multiType = data.getUint8(1);
                CONFIG.msp_version = data.getUint8(2);
                CONFIG.capability = data.getUint32(3, 1);
                break;
            case MSP_codes.MSP_STATUS:
                CONFIG.cycleTime = data.getUint16(0, 1);
                CONFIG.i2cError = data.getUint16(2, 1);
                CONFIG.activeSensors = data.getUint16(4, 1);
                CONFIG.mode = data.getUint32(6, 1);
                CONFIG.profile = data.getUint8(10);

                $('span.i2c-error').text(CONFIG.i2cError);
                $('span.cycle-time').text(CONFIG.cycleTime);
                break;
            case MSP_codes.MSP_BOX:
                AUX_CONFIG_values = []; // empty the array as new data is coming in

                // fill in current data
                for (var i = 0; i < data.byteLength; i += 2) { // + 2 because uint16_t = 2 bytes
                    AUX_CONFIG_values.push(data.getUint16(i, 1));
                }
                break;
            case MSP_codes.MSP_BOXNAMES:
                AUX_CONFIG = []; // empty the array as new data is coming in

                var buff = [];
                for (var i = 0; i < data.byteLength; i++) {
                    if (data.getUint8(i) == 0x3B) { // ; (delimeter char)
                        AUX_CONFIG.push(String.fromCharCode.apply(null, buff)); // convert bytes into ASCII and save as strings

                        // empty buffer
                        buff = [];
                    } else {
                        buff.push(data.getUint8(i));
                    }
                }
                break;
            case MSP_codes.MSP_PIDNAMES:
                PID_names = []; // empty the array as new data is coming in

                var buff = [];
                for (var i = 0; i < data.byteLength; i++) {
                    if (data.getUint8(i) == 0x3B) { // ; (delimeter char)
                        PID_names.push(String.fromCharCode.apply(null, buff)); // convert bytes into ASCII and save as strings

                        // empty buffer
                        buff = [];
                    } else {
                        buff.push(data.getUint8(i));
                    }
                }
                break;
            case MSP_codes.MSP_WP:
                console.log(data);
                break;
            case MSP_codes.MSP_BOXIDS:
                AUX_CONFIG_IDS = []; // empty the array as new data is coming in

                for (var i = 0; i < data.byteLength; i++) {
                    AUX_CONFIG_IDS.push(data.getUint8(i));
                }
                break;
            // Additional baseflight commands that are not compatible with MultiWii
            case MSP_codes.MSP_UID:
                CONFIG.uid[0] = data.getUint32(0, 1);
                CONFIG.uid[1] = data.getUint32(4, 1);
                CONFIG.uid[2] = data.getUint32(8, 1);
                break;
            case MSP_codes.MSP_SET_REBOOT:
                console.log('Reboot request accepted');
                break;
            case MSP_codes.MSP_BUILDINFO:
                var buff = [];

                for (var i = 0; i < data.byteLength; i++) {
                    buff.push(data.getUint8(i));
                }

                CONFIG.buildInfo = String.fromCharCode.apply(null, buff);
                break;
            case MSP_codes.MSP_CURRENT:
            	//console.log("Current Report Received: " + data.getUint8(0).toString());
            	
            	if(CONFIGURATOR.paused) {break;}
            	
            	var currentVal = data.getUint16(0,1);
            	currentVal /= 2;
            	currentVal *= .955; //Calibration
            	
            	var point = new Highcharts.Point();
                point.y = currentVal;
                
            	points.shift();
            	points.push(point);
            	
            	chart.series[0].setData(points, true, false, true);
                
            	break;
            case MSP_codes.MSP_FAULT:
            	var faultStatus = data.getUint8(0);
            	
            	switch (faultStatus){
            		case 0:
                    	$('div#fault').css("background-color","red");
                    	$('div#fault').text("Fault");
                    	break;
            		case 1:
            			$('div#fault').css("background-color","GoldenRod");
                    	$('div#fault').text("Power Failure");
                    	break;
            		case 2:
            			$('div#fault').css("background-color","green");
                    	$('div#fault').text("Nominal");
                    	break;
            		default:
            			$('div#fault').css("background-color","gray");
                		$('div#fault').text("Serial Code ?");
            	}
            	break;
            default:
                console.log('Unknown code detected: ' + code);
        }

        // trigger callbacks, cleanup/remove callback after trigger
        for (var i = this.callbacks.length - 1; i >= 0; i--) { // itterating in reverse because we use .splice which modifies array length
            if (this.callbacks[i].code == code) {
                // save callback reference
                var callback = this.callbacks[i].callback;

                // remove timeout
                clearInterval(this.callbacks[i].timer);

                // remove object from array
                this.callbacks.splice(i, 1);

                // fire callback
                if (callback) callback({'command': code, 'data': data, 'length': message_length});
            }
        }
    },
    send_message: function (code, data, callback_sent, callback_msp) {
        var bufferOut,
            bufView;

        // always reserve 6 bytes for protocol overhead !
        if (data) {
            var size = data.length + 6,
                checksum = 0;

            bufferOut = new ArrayBuffer(size);
            bufView = new Uint8Array(bufferOut);

            bufView[0] = 36; // $
            bufView[1] = 77; // M
            bufView[2] = 60; // <
            bufView[3] = data.length;
            bufView[4] = code;

            checksum = bufView[3] ^ bufView[4];

            for (var i = 0; i < data.length; i++) {
                bufView[i + 5] = data[i];

                checksum ^= bufView[i + 5];
            }

            bufView[5 + data.length] = checksum;
        } else {
            bufferOut = new ArrayBuffer(6);
            bufView = new Uint8Array(bufferOut);

            bufView[0] = 36; // $
            bufView[1] = 77; // M
            bufView[2] = 60; // <
            bufView[3] = 0; // data length
            bufView[4] = code; // code
            bufView[5] = bufView[3] ^ bufView[4]; // checksum
        }

        // dev version 0.57 code below got recently changed due to the fact that queueing same MSP codes was unsupported
        // and was causing trouble while backup/restoring configurations
        // watch out if the recent change create any inconsistencies and then adjust accordingly
        var obj = {'code': code, 'requestBuffer': bufferOut, 'callback': (callback_msp) ? callback_msp : false, 'timer': false};

        var requestExists = false;
        for (var i = 0; i < MSP.callbacks.length; i++) {
            if (MSP.callbacks[i].code == code) {
                // request already exist, we will just attach
                requestExists = true;
                break;
            }
        }

        if (!requestExists) {
            obj.timer = setInterval(function () {
                console.log('MSP data request timed-out: ' + code);

                serial.send(bufferOut, false);
            }, 1000); // we should be able to define timeout in the future
        }

        MSP.callbacks.push(obj);

        // always send messages with data payload (even when there is a message already in the queue)
        if (data || !requestExists) {
            serial.send(bufferOut, function (sendInfo) {
                if (sendInfo.bytesSent == bufferOut.length) {
                    if (callback_sent) callback_sent();
                }
            });
        }

        return true;
    },
    callbacks_cleanup: function () {
        for (var i = 0; i < this.callbacks.length; i++) {
            clearInterval(this.callbacks[i].timer);
        }

        this.callbacks = [];
    },
    disconnect_cleanup: function () {
        this.state = 0; // reset packet state for "clean" initial entry (this is only required if user hot-disconnects)
        this.packet_error = 0; // reset CRC packet error counter for next session

        this.callbacks_cleanup();
    }
};

MSP.crunch = function (code) {
    var buffer = [];

    switch (code) {
        case MSP_codes.MSP_SET_CONFIG:
            buffer.push(BF_CONFIG.mixerConfiguration);
            buffer.push(specificByte(BF_CONFIG.features, 0));
            buffer.push(specificByte(BF_CONFIG.features, 1));
            buffer.push(specificByte(BF_CONFIG.features, 2));
            buffer.push(specificByte(BF_CONFIG.features, 3));
            buffer.push(BF_CONFIG.serialrx_type);
            buffer.push(specificByte(BF_CONFIG.board_align_roll, 0));
            buffer.push(specificByte(BF_CONFIG.board_align_roll, 1));
            buffer.push(specificByte(BF_CONFIG.board_align_pitch, 0));
            buffer.push(specificByte(BF_CONFIG.board_align_pitch, 1));
            buffer.push(specificByte(BF_CONFIG.board_align_yaw, 0));
            buffer.push(specificByte(BF_CONFIG.board_align_yaw, 1));
            buffer.push(lowByte(BF_CONFIG.currentscale));
            buffer.push(highByte(BF_CONFIG.currentscale));
            buffer.push(lowByte(BF_CONFIG.currentoffset));
            buffer.push(highByte(BF_CONFIG.currentoffset));
            break;
        case MSP_codes.MSP_SET_BOX:
            for (var i = 0; i < AUX_CONFIG_values.length; i++) {
                buffer.push(lowByte(AUX_CONFIG_values[i]));
                buffer.push(highByte(AUX_CONFIG_values[i]));
            }
            break;
        default:
            return false;
    }

    return buffer;
};