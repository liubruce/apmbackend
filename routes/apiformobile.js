var express = require('express');
var router = express.Router();
var log = require('log4js').getLogger("apiformobile");
var plugins = require('../plugins/pluginManager.js');
var apmConfig = require('../config/config', 'dont-enclose');
var formidable = require('formidable');
 //   os = require('os');

router.post('/mobile/device', function (req, res, next) {
    log.debug(req.body);
    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});

router.post('/crash', function (req, res, next) {
    log.debug(req.body);
    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});

/*
 router.get('/i', function (req, res, next) {
 console.log('Get:req.query:' + JSON.stringify(req.query));
 log.debug('Get:req.query:' + JSON.stringify(req.query));
 var result = '{"result":"Success"}';
 var jsonObj = JSON.parse(result);
 res.json(jsonObj);
 });



 router.post('/i', function (req, res, next) {
 console.log('Post:req.query:' + JSON.stringify(req.query));
 log.debug('Post:req.query:' + JSON.stringify(req.query));
 var result = '{"result":"Success"}';
 var jsonObj = JSON.parse(result);
 res.json(jsonObj);
 });

 router.post('/i/users', function (req, res, next) {

 //accessdb.createUser(req, res);

 });

 */

plugins.setConfigs("api", {
    domain: "",
    safe: false,
    session_duration_limit: 120,
    city_data: true,
    event_limit: 500,
    event_segmentation_limit: 100,
    event_segmentation_value_limit:1000,
    sync_plugins: false,
    session_cooldown: 15,
    total_users: true
});

plugins.setConfigs("apps", {
    country: "TR",
    timezone: "Europe/Istanbul",
    category: "6"
});

plugins.setConfigs('logs', {
    debug:      (apmConfig.logging && apmConfig.logging.debug)     ?  apmConfig.logging.debug.join(', ')    : '',
    info:       (apmConfig.logging && apmConfig.logging.info)      ?  apmConfig.logging.info.join(', ')     : '',
    warning:    (apmConfig.logging && apmConfig.logging.warning)   ?  apmConfig.logging.warning.join(', ')  : '',
    error:      (apmConfig.logging && apmConfig.logging.error)     ?  apmConfig.logging.error.join(', ')    : '',
    default:    (apmConfig.logging && apmConfig.logging.default)   ?  apmConfig.logging.default : 'warning'
}, undefined, function(config){
    var cfg = plugins.getConfig('logs'), msg = {cmd: 'log', config: cfg};
    if (process.send) { process.send(msg); }
    require('../api/utils/log.js').ipcHandler(msg);
});

plugins.init();

//http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;


var url = require('url'),
    querystring = require('querystring'),
    common = require('../api/utils/common.js'),
    log = common.log('api'),
    crypto = require('crypto'),
    countlyApi = {
        data:{
            usage:require('../api/parts/data/usage.js'),
            fetch:require('../api/parts/data/fetch.js'),
            events:require('../api/parts/data/events.js')
        },
        mgmt:{
            users:require('../api/parts/mgmt/users.js'),
            apps:require('../api/parts/mgmt/apps.js')
        }
    };

process.on('message', common.log.ipcHandler);

var os_mapping = {
    "unknown":"unk",
    "undefined":"unk",
    "tvos":"atv",
    "watchos":"wos",
    "unity editor":"uty",
    "qnx":"qnx",
    "os/2":"os2",
    "windows":"mw",
    "open bsd":"ob",
    "searchbot":"sb",
    "sun os":"so",
    "beos":"bo",
    "mac osx":"o",
    "macos":"o"
};

plugins.dispatch("/worker", {common:common});
// Checks app_key from the http request against "apps" collection.
// This is the first step of every write request to API.
function validateAppForWriteAPI(params, done) {
    common.db.collection('apps').findOne({'key':params.qstring.app_key}, function (err, app) {
        if (!app) {
            if (plugins.getConfig("api").safe) {
                common.returnMessage(params, 400, 'App does not exist');
            }

            return done ? done() : false;
        }

        params.app_id = app['_id'];
        params.app_cc = app['country'];
        params.app_name = app['name'];
        params.appTimezone = app['timezone'];
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

        if (params.qstring.location && params.qstring.location.length > 0) {
            var coords = params.qstring.location.split(',');
            if (coords.length === 2) {
                var lat = parseFloat(coords[0]), lon = parseFloat(coords[1]);

                if (!isNaN(lat) && !isNaN(lon)) {
                    params.user.lat = lat;
                    params.user.lng = lon;
                }
            }
        }

        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, user){
            params.app_user = user || {};

            plugins.dispatch("/sdk", {params:params, app:app});
            if(!params.cancelRequest){
                //check if device id was changed
                if(params.qstring.old_device_id && params.qstring.old_device_id != params.qstring.device_id){
                    function restartRequest(){
                        //remove old device ID and retry request
                        params.qstring.old_device_id = null;
                        //retry request
                        validateAppForWriteAPI(params, done);
                    };

                    var old_id = common.crypto.createHash('sha1').update(params.qstring.app_key + params.qstring.old_device_id + "").digest('hex');
                    //checking if there is an old user
                    common.db.collection('app_users' + params.app_id).findOne({'_id': old_id }, function (err, oldAppUser){
                        if(!err && oldAppUser){
                            //checking if there is a new user
                            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, newAppUser){
                                if(!err && newAppUser){
                                    //merge user data
                                    if(!newAppUser.old)
                                        newAppUser.old = {};
                                    for(var i in oldAppUser){
                                        // sum up session count and total session duration
                                        if(i == "sc" || i == "tsd"){
                                            if(!newAppUser[i])
                                                newAppUser[i] = 0;
                                            newAppUser[i] += oldAppUser[i];
                                        }
                                        //check if old user has been seen before new one
                                        else if(i == "fs"){
                                            if(!newAppUser.fs || oldAppUser.fs < newAppUser.fs)
                                                newAppUser.fs = oldAppUser.fs;
                                        }
                                        //check if old user has been the last to be seen
                                        else if(i == "ls"){
                                            if(!newAppUser.ls || oldAppUser.ls > newAppUser.ls){
                                                newAppUser.ls = oldAppUser.ls;
                                                //then also overwrite last session data
                                                if(oldAppUser.lsid)
                                                    newAppUser.lsid = oldAppUser.lsid;
                                                if(oldAppUser.sd)
                                                    newAppUser.sd = oldAppUser.sd;
                                            }
                                        }
                                        //merge custom user data
                                        else if(i == "custom"){
                                            if(!newAppUser[i])
                                                newAppUser[i] = {};
                                            if(!newAppUser.old[i])
                                                newAppUser.old[i] = {};
                                            for(var j in oldAppUser[i]){
                                                //set properties that new user does not have
                                                if(!newAppUser[i][j])
                                                    newAppUser[i][j] = oldAppUser[i][j];
                                                //preserve old property values
                                                else
                                                    newAppUser.old[i][j] = oldAppUser[i][j];
                                            }
                                        }
                                        //set other properties that new user does not have
                                        else if(i != "_id" && i != "did" && !newAppUser[i]){
                                            newAppUser[i] = oldAppUser[i];
                                        }
                                        //else preserve the old properties
                                        else{
                                            newAppUser.old[i] = oldAppUser[i];
                                        }
                                    }
                                    //update new user
                                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': newAppUser}, {'upsert':true}, function() {
                                        //delete old user
                                        common.db.collection('app_users' + params.app_id).remove({_id:old_id}, function(){
                                            //let plugins know they need to merge user data
                                            plugins.dispatch("/i/device_id", {params:params, app:app, oldUser:oldAppUser, newUser:newAppUser});
                                            restartRequest();
                                        });
                                    });
                                }
                                else{
                                    //simply copy user document with old uid
                                    //no harm is done
                                    oldAppUser.did = params.qstring.device_id + "";
                                    oldAppUser._id = params.app_user_id;
                                    common.db.collection('app_users' + params.app_id).insert(oldAppUser, function(){
                                        common.db.collection('app_users' + params.app_id).remove({_id:old_id}, function(){
                                            restartRequest();
                                        });
                                    });
                                }
                            });
                        }
                        else{
                            //process request
                            restartRequest();
                        }
                    });

                    //do not proceed with request
                    return false;
                }

                plugins.dispatch("/i", {params:params, app:app});

                if (params.qstring.events) {
                    countlyApi.data.events.processEvents(params);
                } else if (plugins.getConfig("api").safe) {
                    common.returnMessage(params, 200, 'Success');
                }

                if (params.qstring.begin_session) {
                    countlyApi.data.usage.beginUserSession(params, done);
                } else if (params.qstring.end_session) {
                    if (params.qstring.session_duration) {
                        countlyApi.data.usage.processSessionDuration(params, function () {
                            countlyApi.data.usage.endUserSession(params);
                        });
                    } else {
                        countlyApi.data.usage.endUserSession(params);
                    }
                    return done ? done() : false;
                } else if (params.qstring.session_duration) {
                    countlyApi.data.usage.processSessionDuration(params);
                    return done ? done() : false;
                } else {
                    // begin_session, session_duration and end_session handle incrementing request count in usage.js
                    var dbDateIds = common.getDateIds(params),
                        updateUsers = {};

                    common.fillTimeObjectMonth(params, updateUsers, common.dbMap['events']);
                    common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {'$inc': updateUsers}, {'upsert':true}, function(err, res){});

                    return done ? done() : false;
                }
            } else {
                return done ? done() : false;
            }
        });
    });
}

function validateUserForWriteAPI(callback, params) {

    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }
        console.dir(member);
        params.member = member;
        callback(params);
    });
}

function validateUserForDataReadAPI(params, callback, callbackParam) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
            common.returnMessage(params, 401, 'User does not have view right for this application');
            return false;
        }

        common.db.collection('apps').findOne({'_id':require('mongodb').ObjectID(params.qstring.app_id + "")}, function (err, app) {
            if (!app) {
                common.returnMessage(params, 401, 'App does not exist');
                return false;
            }
            params.member = member;
            params.app_id = app['_id'];
            params.app_cc = app['country'];
            params.appTimezone = app['timezone'];
            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

            plugins.dispatch("/o/validate", {params:params, app:app});

            if (callbackParam) {
                callback(callbackParam, params);
            } else {
                callback(params);
            }
        });
    });
}

function validateUserForDataWriteAPI(params, callback, callbackParam) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        if (!((member.admin_of && member.admin_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
            common.returnMessage(params, 401, 'User does not have write right for this application');
            return false;
        }

        common.db.collection('apps').findOne({'_id':require('mongodb').ObjectID(params.qstring.app_id + "")}, function (err, app) {
            if (!app) {
                common.returnMessage(params, 401, 'App does not exist');
                return false;
            }

            params.app_id = app['_id'];
            params.appTimezone = app['timezone'];
            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
            params.member = member;

            if (callbackParam) {
                callback(callbackParam, params);
            } else {
                callback(params);
            }
        });
    });
}

function validateUserForGlobalAdmin(params, callback, callbackParam) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        if (!member.global_admin) {
            common.returnMessage(params, 401, 'User does not have global admin right');
            return false;
        }
        params.member = member;

        if (callbackParam) {
            callback(callbackParam, params);
        } else {
            callback(params);
        }
    });
}

function validateUserForMgmtReadAPI(callback, params) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        params.member = member;
        callback(params);
    });
}

var dbconnect = require('../dbconfig/dbconnect');

router.use(function (req, res, next) {
    dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
        dbconnect.assert.equal(null, err);
        console.log('come to api:' + req.url);
        common.db = db;
        plugins.loadConfigs(db, function () {
            var urlParts = url.parse(req.url, true),
                queryString = urlParts.query,
                paths = urlParts.pathname.split("/"),
                apiPath = "",
                params = {
                    'href': urlParts.href,
                    'qstring': queryString,
                    'res': res,
                    'req': req
                };

            //remove countly path
            if (common.config.path == "/" + paths[1]) {
                paths.splice(1, 1);
            }

            function processRequest() {
                if (params.qstring.app_id && params.qstring.app_id.length != 24) {
                    console.log('Invalid parameter "app_id"');
                    common.returnMessage(params, 400, 'Invalid parameter "app_id"');
                    return false;
                }

                if (params.qstring.user_id && params.qstring.user_id.length != 24) {
                    common.returnMessage(params, 400, 'Invalid parameter "user_id"');
                    return false;
                }

                for (var i = 1; i < paths.length; i++) {
                    if (i > 2) {
                        break;
                    }

                    apiPath += "/" + paths[i];
                }
                plugins.dispatch("/", {
                    params: params,
                    apiPath: apiPath,
                    validateAppForWriteAPI: validateAppForWriteAPI,
                    validateUserForDataReadAPI: validateUserForDataReadAPI,
                    validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                    validateUserForGlobalAdmin: validateUserForGlobalAdmin,
                    paths: paths,
                    urlParts: urlParts
                });

                if (!params.cancelRequest) {
                    switch (apiPath) {
                        case '/i/bulk':
                        {

                            //console.log('i/bulk/ requests:' + params.qstring.requests );
                            //console.log('i/bulk/body:' + params.qstring.req.body );
                            console.log('i/bulk/url:' + req.url );
                            var requests = params.qstring.requests,
                                appKey = params.qstring.app_key;

                            if (requests) {
                                try {
                                    requests = JSON.parse(requests);
                                } catch (SyntaxError) {
                                    console.log('Parse bulk JSON failed', requests, req.url, req.body);
                                }
                            } else {
                                common.returnMessage(params, 400, 'Missing parameter "requests"');
                                return false;
                            }
                            common.blockResponses(params);
                            function processBulkRequest(i) {
                                if (i == requests.length) {
                                    common.unblockResponses(params);
                                    common.returnMessage(params, 200, 'Success');
                                    return;
                                }

                                if (!requests[i].app_key && !appKey) {
                                    return processBulkRequest(i + 1);
                                }

                                var tmpParams = {
                                    'app_id': '',
                                    'app_cc': '',
                                    'ip_address': requests[i].ip_address || common.getIpAddress(req),
                                    'user': {
                                        'country': requests[i].country_code || 'Unknown',
                                        'city': requests[i].city || 'Unknown'
                                    },
                                    'qstring': requests[i]
                                };

                                tmpParams["qstring"]['app_key'] = requests[i].app_key || appKey;

                                if (!tmpParams.qstring.device_id) {
                                    return processBulkRequest(i + 1);
                                } else {
                                    tmpParams.app_user_id = common.crypto.createHash('sha1').update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "").digest('hex');
                                }

                                if (tmpParams.qstring.metrics) {
                                    if (tmpParams.qstring.metrics["_carrier"]) {
                                        tmpParams.qstring.metrics["_carrier"] = tmpParams.qstring.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                                            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                                        });
                                    }

                                    if (tmpParams.qstring.metrics["_os"] && tmpParams.qstring.metrics["_os_version"]) {
                                        if (os_mapping[tmpParams.qstring.metrics["_os"].toLowerCase()])
                                            tmpParams.qstring.metrics["_os_version"] = os_mapping[tmpParams.qstring.metrics["_os"].toLowerCase()] + tmpParams.qstring.metrics["_os_version"];
                                        else
                                            tmpParams.qstring.metrics["_os_version"] = tmpParams.qstring.metrics["_os"][0].toLowerCase() + tmpParams.qstring.metrics["_os_version"];
                                    }
                                }
                                return validateAppForWriteAPI(tmpParams, processBulkRequest.bind(null, i + 1));
                            }

                            processBulkRequest(0);

                            break;
                        }
                        case '/i/users':
                        {
                            console.log('params:' + params.qstring.args);
                            if (params.qstring.args) {
                                try {
                                    params.qstring.args = JSON.parse(params.qstring.args);
                                } catch (SyntaxError) {
                                    console.log('Parse ' + apiPath + ' JSON failed', req.url, req.body);
                                }
                            }

                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
                            switch (paths[3]) {
                                case 'create':
                                    validateUserForWriteAPI(countlyApi.mgmt.users.createUser, params);
                                    break;
                                case 'update':
                                    validateUserForWriteAPI(countlyApi.mgmt.users.updateUser, params);
                                    break;
                                case 'delete':
                                    validateUserForWriteAPI(countlyApi.mgmt.users.deleteUser, params);
                                    break;
                                default:
                                    common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update or /delete');
                                    break;
                            }

                            break;
                        }
                        case '/i/apps':
                        {
                            if (params.qstring.args) {
                                try {
                                    params.qstring.args = JSON.parse(params.qstring.args);
                                } catch (SyntaxError) {
                                    console.log('Parse ' + apiPath + ' JSON failed', req.url, req.body);
                                }
                            }

                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }

                            switch (paths[3]) {
                                case 'create':
                                    console.log('come to create' + req.url)
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.createApp, params);
                                    break;
                                case 'update':
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.updateApp, params);
                                    break;
                                case 'delete':
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.deleteApp, params);
                                    break;
                                case 'reset':
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.resetApp, params);
                                    break;
                                default:
                                    common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
                                    break;
                            }

                            break;
                        }
                        case '/i':
                        {
                            params.ip_address = params.qstring.ip_address || common.getIpAddress(req);
                            params.user = {
                                'country': params.qstring.country_code || 'Unknown',
                                'city': params.qstring.city || 'Unknown'
                            };

                            if (!params.qstring.app_key || !params.qstring.device_id) {
                                common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
                                return false;
                            } else {
                                // Set app_user_id that is unique for each user of an application.
                                params.app_user_id = common.crypto.createHash('sha1').update(params.qstring.app_key + params.qstring.device_id + "").digest('hex');
                            }

                            if (params.qstring.metrics) {
                                try {
                                    params.qstring.metrics = JSON.parse(params.qstring.metrics);

                                    if (params.qstring.metrics["_carrier"]) {
                                        params.qstring.metrics["_carrier"] = params.qstring.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                                            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                                        });
                                    }

                                    if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {
                                        if (os_mapping[params.qstring.metrics["_os"].toLowerCase()])
                                            params.qstring.metrics["_os_version"] = os_mapping[params.qstring.metrics["_os"].toLowerCase()] + params.qstring.metrics["_os_version"];
                                        else
                                            params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];
                                    }

                                } catch (SyntaxError) {
                                    console.log('Parse metrics JSON failed', params.qstring.metrics, req.url, req.body);
                                }
                            }

                            if (params.qstring.events) {
                                try {
                                    params.qstring.events = JSON.parse(params.qstring.events);
                                } catch (SyntaxError) {
                                    console.log('Parse events JSON failed', params.qstring.events, req.url, req.body);
                                }
                            }

                            log.i('New /i request: %j', params.qstring);

                            validateAppForWriteAPI(params);

                            if (!plugins.getConfig("api").safe) {
                                common.returnMessage(params, 200, 'Success');
                            }

                            break;
                        }
                        case '/o/users':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }

                            switch (paths[3]) {
                                case 'all':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.users.getAllUsers, params);
                                    break;
                                case 'me':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
                                    break;
                                default:
                                    common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                                    break;
                            }

                            break;
                        }
                        case '/o/apps':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }

                            switch (paths[3]) {
                                case 'all':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getAllApps, params);
                                    break;
                                case 'mine':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getCurrentUserApps, params);
                                    break;
                                default:
                                    common.returnMessage(params, 400, 'Invalid path, must be one of /all or /mine');
                                    break;
                            }

                            break;
                        }
                        case '/o/ping':
                        {
                            common.db.collection("plugins").findOne({_id: "plugins"}, function (err, result) {
                                if (err)
                                    common.returnMessage(params, 404, 'DB Error');
                                else
                                    common.returnMessage(params, 200, 'Success');
                            });
                            return false;
                        }
                        case '/o':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }

                            if (!params.qstring.app_id) {
                                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                                return false;
                            }

                            switch (params.qstring.method) {
                                case 'total_users':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTotalUsersObj, params.qstring.metric);
                                    break;
                                case 'get_period_obj':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.getPeriodObj, 'users');
                                    break;
                                case 'locations':
                                case 'sessions':
                                case 'users':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, 'users');
                                    break;
                                case 'app_versions':
                                case 'device_details':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, 'device_details');
                                    break;
                                case 'devices':
                                case 'carriers':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
                                    break;
                                case 'cities':
                                    if (plugins.getConfig("api").city_data !== false) {
                                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
                                    } else {
                                        common.returnOutput(params, {});
                                    }
                                    break;
                                case 'events':
                                    if (params.qstring.events) {
                                        try {
                                            params.qstring.events = JSON.parse(params.qstring.events);
                                        } catch (SyntaxError) {
                                            console.log('Parse events array failed', params.qstring.events, req.url, req.body);
                                        }

                                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMergedEventData);
                                    } else {
                                        validateUserForDataReadAPI(params, countlyApi.data.fetch.prefetchEventData, params.qstring.method);
                                    }
                                    break;
                                case 'get_events':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCollection, 'events');
                                    break;
                                case 'all_apps':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchAllApps);
                                    break;
                                default:
                                    if (!plugins.dispatch(apiPath, {
                                            params: params,
                                            validateUserForDataReadAPI: validateUserForDataReadAPI,
                                            validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                            validateUserForGlobalAdmin: validateUserForGlobalAdmin
                                        }))
                                        common.returnMessage(params, 400, 'Invalid method');
                                    break;
                            }

                            break;
                        }
                        case '/o/analytics':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }

                            if (!params.qstring.app_id) {
                                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                                return false;
                            }

                            switch (paths[3]) {
                                case 'dashboard':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchDashboard);
                                    break;
                                case 'countries':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCountries);
                                    break;
                                case 'sessions':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchSessions);
                                    break;
                                case 'metric':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMetric);
                                    break;
                                case 'tops':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTops);
                                    break;
                                case 'loyalty':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchLoyalty);
                                    break;
                                case 'frequency':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchFrequency);
                                    break;
                                case 'durations':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchDurations);
                                    break;
                                default:
                                    if (!plugins.dispatch(apiPath, {
                                            params: params,
                                            validateUserForDataReadAPI: validateUserForDataReadAPI,
                                            validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                            paths: paths,
                                            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                            validateUserForGlobalAdmin: validateUserForGlobalAdmin
                                        }))
                                        common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                                    break;
                            }

                            break;
                        }
                        default:
                            if (!plugins.dispatch(apiPath, {
                                    params: params,
                                    validateUserForDataReadAPI: validateUserForDataReadAPI,
                                    validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                    validateUserForWriteAPI: validateUserForWriteAPI,
                                    paths: paths,
                                    validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                    validateUserForGlobalAdmin: validateUserForGlobalAdmin
                                }))
                                common.returnMessage(params, 400, 'Invalid path');
                    }
                }
            };

            if (req.method.toLowerCase() == 'post') {
                var form = new formidable.IncomingForm();
                req.body = '';

                req.on('data', function (data) {
                    req.body += data;
                });

                form.parse(req, function (err, fields, files) {
                    params.files = files;
                    for (var i in fields) {
                        params.qstring[i] = fields[i];
                    }

                    console.log('post to here:' + JSON.stringify(params.qstring) );
                    processRequest();
                });
            }
            else
            //attempt process GET request
                processRequest();
        }, true)
    });

    //next();

});


module.exports = router;