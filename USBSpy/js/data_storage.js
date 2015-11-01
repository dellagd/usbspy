'use strict';

var CONFIGURATOR = {
    'releaseDate': 1417875879820, // new Date().getTime() - 2014.12.06
    'firmwareVersionAccepted': 2.31,
    'backupFileMinVersionAccepted': '0.55', // chrome.runtime.getManifest().version is stored as string, so does this one
    'connectionValid': false,
    'cliActive': false,
    'cliValid': false,
    'paused': false
};

var CONFIG = {
    version:       0,
    buildInfo:     '',
    multiType:     0,
    msp_version:   0,
    capability:    0,
    cycleTime:     0,
    i2cError:      0,
    activeSensors: 0,
    mode:          0,
    profile:       0,
    uid:           [0, 0, 0],
    accelerometerTrims: [0, 0]
};