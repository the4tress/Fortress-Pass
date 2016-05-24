var CryptoJS = require("./lib/hmac-sha256.js");

CryptoJS = CryptoJS.CryptoJS;

var c = console;
var url = "google.com";
var pass = "test";
var salt = "CryptoJS Pass"
var hash = CryptoJS.SHA256(url + ":" + pass + ":" + salt).toString(CryptoJS.enc.Hex);

var options = {
    lowerCase: "abcdefghijklmnopqrstuvwxyz",
    upperCase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    special: "!#$%&()*+,-./:;<=>?@[]^_`{|}~",
    countReq: 2,
    passLength: 16
};

function init() {
    if (options.passLength < (options.countReq * 4)) {
        c.log("Password length needs to be at least 4x the count requirement");
        return;
    }

    if (options.passLength > 32) {
        c.log("Maximum password length is 32.");
        return;
    }

    options.validChars = [options.lowerCase, options.upperCase, options.numbers, options.special].join('');

    options.valid = {
        ascii: options.validChars.split(""),
        hex: getHex(options.validChars)
    };

    password = hashToPass(hash);

    while (password === false) {
        hash = CryptoJS.SHA256(hash).toString(CryptoJS.enc.Hex);
        password = hashToPass(hash);
    }

    return password;
}

function getHex(asciiString) {
    hexArray = [];

    for (i in options.validChars) {
        hexArray.push(asciiString.charCodeAt(i).toString(16));
    }
    return hexArray;
}

function meetsMin(password) {
    var passArr = password.split(""),

        upper = (passArr.filter(function(n) {
            return options.upperCase.split("").indexOf(n) > -1;
        })).length >= options.countReq,

        lower = (passArr.filter(function(n) {
            return options.lowerCase.split("").indexOf(n) > -1;
        })).length >= options.countReq,

        number = (passArr.filter(function(n) {
            return options.numbers.split("").indexOf(n) > -1;
        })).length >= options.countReq,

        special = (passArr.filter(function(n) {
            return options.special.split("").indexOf(n) > -1;
        })).length >= options.countReq;

    return (upper && lower && number && special) ? true : false;
}

function hashToPass(hash) {
    password = "";
    for (var i = 0; i <= hash.length -2; i++) {
        hexChar = hash.slice(i, i +2);

        hexIndex = options.valid.hex.indexOf(hexChar);
        if (hexIndex >= 0) {
            password += options.valid.ascii[hexIndex];
        }
    }

    for (i = 0; i <= password.length - options.passLength; i++) {
        tmp_password = password.slice(i, options.passLength + i);
        if (meetsMin(tmp_password)) {
            return tmp_password;
        }
    }

    return false;
}

c.log(init());

