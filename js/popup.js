var content, background, tmp;

var c = {
    /*
        This is used for debugging. Debugging a Chrome extension is a HUGE pain
        because there are so many sections to keep track of (popup, background,
        content). 'c' is a shortcut for 'console' but it will relay the console
        message to all other sections. So if you use c.log('blah') in popup, it
        will also display in background and content (depending on the settings
        below). It's far from perfect, but really helps troubleshooting annoying
        bugs.

        This relies on the setupMessaging function and lives in popup.js,
        background.js, and content.js.

        TODO:
        !   I need to look into modifying/extending the console object. Right now
            it doesn't relay error messages from the DOM.
        !   If I don't modify the console object, I need to make this an object
            and prototype it for easier management.
    */



    // To which sections should this page's console messages be relayed?
    _targets: {
        popup: true,
        background: false,
        content: true
    },

    // Define styles for the different types of messaging
    _styles: {
        str: 'background: #dff0d8; padding: 2px 2px; border-bottom: 1px solid #4cae4c;',
        sys: 'background: #dff0d8; padding: 2px 2px; border-bottom: 1px solid #4cae4c; font-weight: bold;',
        obj: 'padding: 2px 0px;'
    },

    // Define the basics of console.
    log: function() { c._write('log', Array.prototype.slice.call(arguments)); },
    info: function() { c._write('info', Array.prototype.slice.call(arguments)); },
    warn: function() { c._write('warn', Array.prototype.slice.call(arguments)); },
    debug: function() { c._write('debug', Array.prototype.slice.call(arguments)); },
    error: function() { c._write('error', Array.prototype.slice.call(arguments)); },
    group: function() { c._write('group', Array.prototype.slice.call(arguments)); },
    groupEnd: function() { c._write('groupEnd', Array.prototype.slice.call(arguments)); },
    clear: function() { c._write('clear', Array.prototype.slice.call(arguments)); },

    // Format and write the console message based on the type of data being displayed
    _write: function(action, args) {
        // Set the basic styles for this page.
        // Popup messages start with [P]
        a = ['%c[P]', c._styles.str];
        for (arg in args) {
            switch (typeof args[arg]) {
                case 'string':
                case 'int':
                case 'number':
                    a[0] += '%c%s';
                    a.push(c._styles.str);
                    a.push(args[arg]);
                    break;

                case 'boolean':
                case 'undefined':
                case 'null':
                    a[0] += '%c%s';
                    a.push(c._styles.sys);
                    a.push(args[arg])
                    break;

                case 'function':
                case 'object':
                    a[0] += ' %c%o'
                    a.push(c._styles.obj);
                    a.push(args[arg]);
                    break;

                default:
                    a.push('unknown: ' + typeof args[arg]);
            }
        }

        // If _targets.popup is true, apply a basic console call
        if (c._targets.popup) { console[action].apply(console, a); }

        // If _targets.background is true, use the Chrome API to apply the
        //  background page's console function
        if (c._targets.background) {
            chrome.extension.getBackgroundPage().console[action]
                .apply(chrome.extension.getBackgroundPage().console, a);
        }

        // If _targets.content is true, post a message to content. This requires
        //  that console is listening for the message.
        if (c._targets.content) {
            content.postMessage({
                method: 'console',
                action: action,
                args: a
            });
        }
    }
};

var settings = {
    characters: {
        lowercase: {
            string: 'abcdefghijklmnopqrstuvwxyz',
            regex: /[a-z]/g
        },

        uppercase: {
            string: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            regex: /[A-Z]/g
        },

        numbers: {
            string: '0123456789',
            regex: /[0-9]/g
        },

        special: {
            string: '.-:+=^!/*?&<>()[]{}@%$#',
            regex: /[\.\-\:\+\=\^\!\/\*\?\&\<\>\(\)\[\]\{\}\@\%\$\#]/g
        }
    },

    criteria: {
        uppercase: 2,
        lowercase: 2,
        numbers: 2,
        special: 2,
        length: 12
    },

    maxTries: 1
};

window.onload = function() {
    setupMessaging();

    $('#genPass').on('click', function(e) {
        chrome.tabs.getSelected(null, function(tab) {
            tab.url = $('<a/>', { href: tab.url })[0];

            var domain = tab.url.hostname;
                password = $('#password').val(),
                passSalt = [domain, password].join(':'),
                passHash = hash(passSalt),
                passEnc = encode(passHash),
                strongPass = findStrongPass(passEnc, settings.criteria),
                strength = checkStrength(passEnc, settings.criteria);

            if (strongPass.result) {
                content.postMessage({
                    method: 'fillPass',
                    password: strongPass.password
                });
            }
        });
    });
};

function setupMessaging() {
    // Enable messaging for content
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        content = chrome.tabs.connect(tabs[0].id, { name: 'popup2content' });
        content.postMessage({ method: 'ready' });
        content.onMessage.addListener(function(msg) {
            c.group('Inbound content message', msg.method);
            messagingMethods(msg);
            c.groupEnd();
        });
    });
}

function messagingMethods(msg) {
    /*
        This handles the messages recieved from background.js or content.js.

        Add all messaging methods here.
    */

    // Log everything except console methods. This prevents an infinite loop from 'c'.
    var skipMethods = ['console'];
    if (!_.contains(skipMethods, msg.method)) { c.log('msg', msg); }

    switch(msg.method) {
        case 'ready':
            // c.log('Ready to send to content.');
            // c.log('Sending "test" to content.');
            // content.postMessage({ method: 'test' });
            break;

        case 'pageInfo':
            var info = msg.info.split('.');
            var domain = [info[info.length -2], info[info.length -1]].join('.');
            var password = $('#password').val();
            var passSalt = [domain, password].join(':');
            var passHash = hash(passSalt);
            var passEnc = encode(passHash);

            c.log('domain', domain);
            c.log('password', password);
            c.log('passSalt', passSalt);
            c.log('passHash', passHash);
            c.log('passEnc', passEnc);
            break;

        default:
            c.warn('No method for ' + msg.method);
    }
}

function getPass(domain, password) {

}

function hash(string) {
    // http://www.myersdaily.org/joseph/javascript/md5-text.html
    function md5cycle(x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17,  606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12,  1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7,  1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7,  1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22,  1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14,  643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9,  38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5,  568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20,  1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14,  1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16,  1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11,  1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4,  681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23,  76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16,  530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10,  1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6,  1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6,  1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21,  1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15,  718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }

    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function md51(s) {
        txt = '';

        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878], i;

        for (i=64; i<=s.length; i+=64) {
            md5cycle(state, md5blk(s.substring(i-64, i)));
        }

        s = s.substring(i-64);
        var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];

        for (i=0; i<s.length; i++) {
            tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
        }

        tail[i>>2] |= 0x80 << ((i%4) << 3);

        if (i > 55) {
            md5cycle(state, tail);
            for (i=0; i<16; i++) {
                tail[i] = 0;
            }
        }

        tail[14] = n*8;
        md5cycle(state, tail);

        return state;
    }

    /* there needs to be support for Unicode here,
     * unless we pretend that we can redefine the MD-5
     * algorithm for multi-byte characters (perhaps
     * by adding every four 16-bit characters and
     * shortening the sum to 32 bits). Otherwise
     * I suggest performing MD-5 as if every character
     * was two bytes--e.g., 0040 0025 = @%--but then
     * how will an ordinary MD-5 sum be matched?
     * There is no way to standardize text to something
     * like UTF-8 before transformation; speed cost is
     * utterly prohibitive. The JavaScript standard
     * itself needs to look at this: it should start
     * providing access to strings as preformed UTF-8
     * 8-bit unsigned value arrays.
     */
    function md5blk(s) { /* I figured global was faster.   */
        var md5blks = [], i; /* Andy King said do it this way. */

        for (i=0; i<64; i+=4) {
            md5blks[i>>2] = s.charCodeAt(i)
            + (s.charCodeAt(i+1) << 8)
            + (s.charCodeAt(i+2) << 16)
            + (s.charCodeAt(i+3) << 24);
        }

        return md5blks;
    }

    var hex_chr = '0123456789abcdef'.split('');

    function rhex(n) {
        var s='', j=0;

        for(; j<4; j++) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }

        return s;
    }

    function hex(x) {
        for (var i=0; i<x.length; i++) {
            x[i] = rhex(x[i]);
        }

        return x.join('');
    }

    function md5(s) {
        return hex(md51(s));
    }

    /* this function is much faster,
    so if possible we use it. Some IEs
    are the only ones I know of that
    need the idiotic second function,
    generated by an if clause.  */

    function add32(a, b) {
        return (a + b) & 0xFFFFFFFF;
    }

    if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
        function add32(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);

            return (msw << 16) | (lsw & 0xFFFF);
        }
    }

    return md5(string);
}

function encode(data) {
    // https://github.com/msealand/z85.node/blob/master/index.js
    var encoder = function (characters) {
        var encoderCharacters;
        for (var item in characters) { encoderCharacters += characters[item].string; }
        return encoderCharacters;
    }(settings.characters);

    // Pad the string to make divisible by 4
    if ((data.length % 4) != 0) {
        var padding = Array(5 - data.length %4).join('0');
        data += padding;
    }
    // c.log('padded data', data);

    var str = '',
        byte_nbr = 0,
        size = data.length,
        value = 0;

    while (byte_nbr < size) {
        var characterCode = (typeof data === 'string'
            ? data.charCodeAt(byte_nbr++)
            : data[byte_nbr++]);

        value = (value * 256) + characterCode;

        if ((byte_nbr % 4) == 0) {
            var divisor = Math.pow(85, 4); // 85 * 85 * 85 * 85

            while (divisor >= 1) {
                var idx = Math.floor(value / divisor) % 85;
                str += encoder[idx];
                divisor /= 85;
            }

            value = 0;
        }
    }

    return str;
};

function findStrongPass(data, options, tries) {
    var tries = tries || 1;

    if (data.length < options.length) {
        return {
            result: false,
            message: 'Password too short',
            password: null
        };
    }

    data += data.substr(0, options.length -1);

    var i = 0;
    while (i + length <= data.length) {
        var subData = data.substr(i, options.length);
        if (checkStrength(subData, options).strong) {
            c.info('strong password', subData);
            return {
                result: true,
                message: 'Successfully found strong password',
                password: subData
            };
        }

        i++;
    }

    tries++;

    if (tries >= 10) {
        return {
            result: false,
            message: 'Tried 10 times without finding a strong password',
            password: null
        };
    }
    return findStrongPass(encode(data), options, tries);
}

function checkStrength(data, options, cb) {
    var defaults = { uppercase: 0, lowercase: 0,
        numbers: 0, special: 0, length: 8 };

    options = (!options ? defaults : $.extend({}, defaults, options));
    // data += data.substr(0, options.length -1);
    var result = { length: data.length };

    // c.log('options', options);
    // c.log(data);
    // $.each(defaults, function(item) {
    //     if (item === 'length') return;
    //     result[item] = (data.length - data.replace(settings.characters[item].regex));
    // });

    var resultCounts = {
        lowercase: { count: (data.length - data.replace(settings.characters.lowercase.regex, '').length) },
        uppercase: { count: (data.length - data.replace(settings.characters.uppercase.regex, '').length) },
        numbers: { count: (data.length - data.replace(settings.characters.numbers.regex, '').length) },
        special: { count: (data.length - data.replace(settings.characters.special.regex, '').length) },
        length: data.length
    };

    var resultPass = {
        lowercase: { pass: (resultCounts.lowercase.count >= options.lowercase) },
        uppercase: { pass: (resultCounts.uppercase.count >= options.uppercase) },
        numbers: { pass: (resultCounts.numbers.count >= options.numbers) },
        special: { pass: (resultCounts.special.count >= options.special) },
        length: { pass: (resultCounts.length.count >= options.length) },
        strong: ((resultCounts.lowercase.count >= options.lowercase)
            && (resultCounts.uppercase.count >= options.uppercase)
            && (resultCounts.numbers.count >= options.numbers)
            && (resultCounts.special.count >= options.special)
            && (resultCounts.length >= options.length)),
        password: data
    };

    return $.extend(true, {}, resultPass, resultCounts);
}

function password(pass) {
    var _this = this;

    this.value = pass;
}
