/**
 * Created by bruceliu on 16/8/11.
 */

var http = require('http');
var qs = require('querystring');



function httpPostAPM(urlpath) {



    var post_data = {test:'测试我的接口chenchao'};//这是需要提交的数据

    var content = qs.stringify(post_data);

    var options = {
        host: '192.168.1.107',
        port: '3000',
        path: urlpath,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': content.length
        }
    };

    console.log(options);

    var req = http.request(options, function (res) {
        var _data = '';
        //console.log(res);
        res.on('data', function (chunk) {
            _data += chunk;
        });
        res.on('end', function () {
            console.log("\n--->>\nresult:", _data)
        });
    });

    req.on('error', function (e) {
            console.error('网络问题:' + e.message); // + res.statusCode);
        }
    );
    req.write(content);
    req.end();


}


module.exports.httpPostAPM = httpPostAPM;
