import path from 'path';
import fs from 'fs';
import * as x from 'kd-utils';

const {
    map, filter, without, reduce, promisify, deep_flatten
} = x;

const {
    async_take_while_right,
    async_flow
} = x;

let xfs = (function (fs, fn_name_list) {
    return  reduce((prev, name) => {
        return Object.assign(prev, { [name]: promisify(fs[name], fs) })
    }, {}, fn_name_list);
})(fs, ['readFile', 'writeFile', 'mkdir', 'stat', 'readdir']);

let mkdirp = (dir) => {
    let dir_parts = path.resolve(dir).split(path.sep),
        dir_paths = reduce((prev, cur) => {
            prev.push(
                prev.length ? [prev[prev.length - 1], cur].join(path.sep) : ''
            );
            return prev;
        }, [], dir_parts);

    return async_take_while_right(dir => {
        return new Promise((resolve, reject) => {
            xfs.stat(dir).then(
                 (stats) => stats.isDirectory() ? resolve(false) : resolve(true),
                 (err)   => resolve(true)
             );
        });
    }, dir_paths)
    .then(
        (dir_paths) => async_flow(xfs.mkdir, dir_paths),
        (err) => console.log("!!!!! mkdirp error: " + err)
    );
};

let ensure_dir = (dir) => {
    return new Promise((resolve, reject) => {
        xfs.stat(dir)
        .then(
            stats => {
                resolve(stats.isDirectory() ? true : mkdirp(dir));
            },
            err   => {
                resolve(mkdirp(dir));
            }
        );
    });
};

let is_dir = (dir) => {
    return xfs.stat(dir)
    .then(stats => stats.isDirectory());
};

let find_file = (pattern, dir, options = {}) => {
    let {max_depth} = options;

    max_depth = max_depth || -1;

    let helper = (dir, pattern, left_depth) => {
        if (left_depth === 0)    return Promise.resolve([]);

        return xfs.readdir(dir)
        .then(filter(x => x !== '.' && x !== '..'))
        .then(files => {
            let gen_task = (file) => {
                let full_path = path.join(dir, file);

                return xfs.stat(full_path)
                .then(stats => {
                    if (stats.isDirectory()) {
                        return helper(full_path, pattern, left_depth - 1);
                    }

                    return pattern.test(file) ? full_path : null;
                });
            };

            if (files.length === 0) {
                return [];
            }

            return Promise.all(map(gen_task, files))
            .then(filter(x => x !== null && x.length > 0))
            .then(deep_flatten);
        });
    };

    return helper(dir, pattern, max_depth);
};


Object.assign(xfs, {
    mkdirp, ensure_dir, find_file
});

module.exports = xfs;

