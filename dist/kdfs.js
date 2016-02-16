'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _kdUtils = require('kd-utils');

var x = _interopRequireWildcard(_kdUtils);

var map = x.map;
var filter = x.filter;
var without = x.without;
var reduce = x.reduce;
var promisify = x.promisify;
var deep_flatten = x.deep_flatten;
var async_take_while_right = x.async_take_while_right;
var async_flow = x.async_flow;

var xfs = (function (fs, fn_name_list) {
    return reduce(function (prev, name) {
        return Object.assign(prev, _defineProperty({}, name, promisify(fs[name], fs)));
    }, {}, fn_name_list);
})(_fs2['default'], ['readFile', 'writeFile', 'mkdir', 'stat', 'readdir']);

var mkdirp = function mkdirp(dir) {
    var dir_parts = _path2['default'].resolve(dir).split(_path2['default'].sep),
        dir_paths = reduce(function (prev, cur) {
        prev.push(prev.length ? [prev[prev.length - 1], cur].join(_path2['default'].sep) : '');
        return prev;
    }, [], dir_parts);

    return async_take_while_right(function (dir) {
        return new Promise(function (resolve, reject) {
            xfs.stat(dir).then(function (stats) {
                return stats.isDirectory() ? resolve(false) : resolve(true);
            }, function (err) {
                return resolve(true);
            });
        });
    }, dir_paths).then(function (dir_paths) {
        return async_flow(xfs.mkdir, dir_paths);
    }, function (err) {
        return console.log("!!!!! mkdirp error: " + err);
    });
};

var ensure_dir = function ensure_dir(dir) {
    return new Promise(function (resolve, reject) {
        xfs.stat(dir).then(function (stats) {
            resolve(stats.isDirectory() ? true : mkdirp(dir));
        }, function (err) {
            resolve(mkdirp(dir));
        });
    });
};

var is_dir = function is_dir(dir) {
    return xfs.stat(dir).then(function (stats) {
        return stats.isDirectory();
    });
};

var find_file = function find_file(pattern, dir) {
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    var max_depth = options.max_depth;

    max_depth = max_depth || -1;

    var helper = function helper(dir, pattern, left_depth) {
        if (left_depth === 0) return Promise.resolve([]);

        return xfs.readdir(dir).then(filter(function (x) {
            return x !== '.' && x !== '..';
        })).then(function (files) {
            var gen_task = function gen_task(file) {
                var full_path = _path2['default'].join(dir, file);

                return xfs.stat(full_path).then(function (stats) {
                    if (stats.isDirectory()) {
                        return helper(full_path, pattern, left_depth - 1);
                    }

                    return pattern.test(file) ? full_path : null;
                });
            };

            if (files.length === 0) {
                return [];
            }

            return Promise.all(map(gen_task, files)).then(filter(function (x) {
                return x !== null && x.length > 0;
            })).then(deep_flatten);
        });
    };

    return helper(dir, pattern, max_depth);
};

Object.assign(xfs, {
    mkdirp: mkdirp, ensure_dir: ensure_dir, find_file: find_file
});

exports['default'] = xfs;
module.exports = exports['default'];
