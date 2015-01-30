// http://en.wikipedia.org/wiki/ANSI_escape_code
var formats = {
    bold: [1, 22], // bright
    light: [2, 22], // faint
    italic: [3, 23],
    underline: [4, 24], // underline single
    blink_slow: [5, 25],
    blink_fast: [6, 25],
    inverse: [7, 27],
    conceal: [8, 28],
    strikethrough: [9, 29], // crossed-out
    // 10 - 20 are font control
    underline_double: [21, 24],
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    grey: [90, 39]
};

var CSI = String.fromCharCode(27) + "[";

Object.keys(formats).forEach(function (format) {
    exports[format] = function fmt(str) {
        if (exports.no_color) {
            return str;
        }
        return CSI + formats[format][0] + "m" + str + CSI + formats[format][1] + "m";
    };
});

exports.no_color = false;
