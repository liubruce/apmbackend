/**
 * Created by bruceliu on 16/8/12.
 */

//var apmConfig = require('../config/config', 'dont-enclose');

var dbconnect = require('../dbconfig/dbconnect');

var url = require('url');

function writeDeviceInfo(currentTime, statusCode, responseTime, taskid, availrate, correctrate, monitorid) {


    var values = [device_id, system_name, app_version, os_version, mobile_type, device_name, project_name];

    var insertSql = 'INSERT INTO mobileDevice SET device_id = ?, system_name = ? , ' +
        'app_version = ?, os_version=?, mobile_type=?, device_name=?, bundleid =?';
    //console.log(insertSql);
    connection.query(insertSql, values,
        function (error, results) {
            if (error) {
                log4js.error("Write Device Info 监控数据错误 Error: " + error.message);
                //connection.end();
                return;
            }
            log4js.debug('Inserted: ' + results.affectedRows + ' row.');
            log4js.debug('Id inserted: ' + results.insertId);
        }
    );
}

function ifUserNotExist(db, newemail, newusername) {

    db.collection('members').find({$or: [{email: newemail}, {username: newusername}]}, function (err, member) {
        if (member || err) {
            console.log('Email or username already exists');
            console.log(member);
            return false;
        } else {
            //createUser();
            return true;
        }
    });

}

function findUsers(db, newemail, newusername, callback) {
    // Get the documents collection
    var collection = db.collection('members');
    var ifExist;
    // Find some documents
    collection.find({$or: [{email: newemail}, {username: newusername}]}).toArray(function (err, docs) {
        //assert.equal(err, null);
        console.log("Found the following records");
        console.dir(docs);
        if (docs.length > 0) {
            console.log('true');
            ifExist = true;
        }
        else {
            console.log('false');
            ifExist = false;
            // callback(docs);
        }

        callback(docs,ifExist);
    });
}

function createUser(req, res) {
//var dbconnect = require('../dbconfig/dbconnect');
    var url = require('url');
    var urlParts = url.parse(req.url, true),
        queryString = urlParts.query,
        paths = urlParts.pathname.split("/"),
        apiPath = "",
        params = {
            'href':urlParts.href,
            'qstring':queryString,
            'res':res,
            'req':req
        };
    console.log(urlParts);
    console.log(queryString);
    console.log(paths);
    console.log(params.qstring.args);


    dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
        dbconnect.assert.equal(null, err);
        console.log("Connected correctly to server");
        findUsers(db, 'bruce.liu@dclingcloud.com', 'bruceliu', function(docs, ifExist){
            insertUser(db, docs, ifExist)
        });

    });

}

function insertUser(db, docs, ifExist) {

    var member = {
        "full_name": "bruceliu",
        "username": "bruceliu",
        "password": "911c2e414e44ac3db194cb3f887cc3670b5997bc",
        "email": "bruce.liu@dclingcloud.com",
        "global_admin": true,
        "lang": "zh",
        "api_key": "854f5021d2b9fe6c1e1ef7e93a6e04e6",
        "in_user_id": "34674324be032f7923e796fc4e704403",
        "in_user_hash": "94d6b2fde36545075de2c18c3bd3f0ef6651dde1",
        "offer": 2
    };

    if (ifExist === false) {
        console.log('ifExist:' + ifExist);
        console.log('begin');
        var collection = db.collection('members');
        collection.insertOne(member, function (err, result) {
            console.log('result: 0000 ' + result);
            //db.close();
        });
        db.close();
    } else {
        console.log('user is exist!')
    }
}

module.exports.createUser = createUser;
