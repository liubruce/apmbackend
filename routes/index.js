var express = require('express');
var router = express.Router(),
    crypto = require('crypto');
var log = require('log4js').getLogger("index");
var accessdb = require('../service/accessdb');
var dbconnect = require('../dbconfig/dbconnect');
var apmConfig = require('../config/config', 'dont-enclose');
var apmStats = require('../api/parts/data/stats.js');

var versionInfo = require('../version.info'),
    APM_VERSION = versionInfo.version,
    APM_TYPE = versionInfo.type,
    APM_PAGE = versionInfo.page = (!versionInfo.title) ? "" : null,
    APM_NAME = versionInfo.title = versionInfo.title || "LingCloud";
var
    expose = require('express-expose'),
    fs = require('fs'),
    path = require('path'),
    sharp = require('sharp'),
    async = require('async'),
    stringJS = require('string'),
    flash = require('connect-flash'),
    _ = require('underscore'),
    apmMail = require('../api/parts/mgmt/mail.js'),
    plugins = require('../plugins/pluginManager.js');

var APM_NAMED_TYPE = "Application Trace v" + APM_VERSION;
var APM_TYPE_CE = true;
var APM_TRIAL = (versionInfo.trial) ? true : false;
var APM_TRACK_TYPE = "OSS";

if (versionInfo.footer) {
    APM_NAMED_TYPE = versionInfo.footer;
    APM_TYPE_CE = false;
    if (APM_NAMED_TYPE == "APM Cloud")
        APM_TRACK_TYPE = "Cloud";
    else if (COUNTLY_TYPE != "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6")
        APM_TRACK_TYPE = "Enterprise";
}
else if (APM_TYPE != "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
    APM_NAMED_TYPE = "APM Enterprise Edition v" + APM_VERSION;
    APM_TYPE_CE = false;
    APM_TRACK_TYPE = "Enterprise";
}



function sha1Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
}

function md5Hash(str) {
    return crypto.createHash('md5').update(str + "").digest('hex');
    //console.log('md5Hash' + str);
}

function isGlobalAdmin(req) {
    //console.log(req.session.gadm);
    return (req.session.gadm);
}

function sortBy(arrayToSort, sortList) {
    if (!sortList.length) {
        return arrayToSort;
    }

    var tmpArr = [],
        retArr = [];

    for (var i = 0; i < arrayToSort.length; i++) {
        var objId = arrayToSort[i]["_id"] + "";
        if (sortList.indexOf(objId) !== -1) {
            tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
        }
    }

    for (var i = 0; i < tmpArr.length; i++) {
        if (tmpArr[i]) {
            retArr[retArr.length] = tmpArr[i];
        }
    }

    for (var i = 0; i < arrayToSort.length; i++) {
        if (retArr.indexOf(arrayToSort[i]) === -1) {
            retArr[retArr.length] = arrayToSort[i];
        }
    }

    return retArr;
}

var countlyDb = plugins.dbConnection(apmConfig);

router.get(apmConfig.path+'/', function (req, res, next) {
    res.redirect(apmConfig.path+'/login');
});

//serve app images
router.get(apmConfig.path+'/appimages/*', function(req, res) {
    //string.replace()
    res.sendFile(__dirname.replace(/routes/, "") + 'public/images/default_app_icon.png');
});



var extendSession = function(req, res, next){
    req.session.expires = Date.now() + plugins.getConfig("frontend", req.session.settings).session_timeout;
};

var checkRequestForSession = function (req, res, next) {

    //console.log('checkRequestForSession');
    //console.log(req);
    if (parseInt(plugins.getConfig("frontend", req.session.settings).session_timeout)) {
        if (req.session.uid) {
            if (Date.now() > req.session.expires) {
                //logout user
                res.redirect(apmConfig.path + '/logout?message=logout.inactivity');
            }
            else {
                //extend session
                extendSession(req, res, next);
                next();
            }
        }
        else
            next();
    }
    else
        next();
};


router.get(apmConfig.path+'/ping', function(req, res, next) {
    dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
        db.collection("plugins").find({_id: "plugins"}, function (err, result) {
            if (err)
                res.status(404).send("DB Error");
            else
                res.send("Success");
        });
    });
});

router.get(apmConfig.path+'/session', function(req, res, next) {
    if (req.session.uid) {
        if(Date.now() > req.session.expires){
            //logout user
            res.send("logout");
        }
        else{
            //extend session
            extendSession(req, res, next);
            res.send("success");
        }
    }
    else
        res.send("login");
});


router.get(apmConfig.path+'/dashboard', checkRequestForSession);
router.post('*', checkRequestForSession);


router.get(apmConfig.path + '/logout', function (req, res, next) {
    if (req.session) {
        //plugins.callMethod("userLogout", {req:req, res:res, next:next, data:{uid:req.session.uid, email:req.session.email}});
        req.session.uid = null;
        req.session.gadm = null;
        req.session.email = null;
        req.session.settings = null;
        res.clearCookie('uid');
        res.clearCookie('gadm');
        req.session.destroy(function () {
        });
    }
    if (req.query.message)
        res.redirect(apmConfig.path + '/login?message=' + req.query.message);
    else
        res.redirect(apmConfig.path + '/login');
});

router.get(apmConfig.path + '/dashboard', function (req, res, next) {
    //console.log('uid: ' + req.session.uid);
    if (!req.session.uid) {
        res.redirect(apmConfig.path + '/login');
    } else {
        dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
            var searchStr = {"_id": require('mongodb').ObjectID(req.session.uid)};
            //console.log(searchStr);
            db.collection('members').find(searchStr).toArray(function (err, members) { //db.ObjectID(
                var member;
                //console.dir(members);
                if (members.length === 1) var member = members[0];

                //console.dir(member);
                //console.log(member._id);

                if (member) {
                    var adminOfApps = [],
                        userOfApps = [],
                        apmGlobalApps = {},
                        apmGlobalAdminApps = {};

                    //console.log('global_admin:' + member['global_admin']);

                    if (member['global_admin']) {
                        db.collection('apps').find({}).toArray(function (err, apps) {
                            adminOfApps = apps;
                            userOfApps = apps;
                            console.dir('apps:' + apps);
                            /*db.collection('graph_notes').find().toArray(function (err, notes) {
                                var appNotes = [];
                                for (var i = 0; i < notes.length; i++) {
                                    appNotes[notes[i]["_id"]] = notes[i]["notes"];
                                }
*/
                                for (var i = 0; i < apps.length; i++) {
                                    apps[i].type = apps[i].type || "mobile";
                                    //apps[i]["notes"] = appNotes[apps[i]["_id"]] || null;
                                    apmGlobalApps[apps[i]["_id"]] = apps[i];
                                    apmGlobalApps[apps[i]["_id"]]["_id"] = "" + apps[i]["_id"];
                                }

                                apmGlobalAdminApps = apmGlobalApps;
                                //console.dir('apmGlobalAdminApps:' + JSON.stringify(apmGlobalApps));
                                renderDashboard();
                           // });
                        });
                    } else {
                        var adminOfAppIds = [],
                            userOfAppIds = [];

                        if (member.admin_of.length == 1 && member.admin_of[0] == "") {
                            member.admin_of = [];
                        }

                        for (var i = 0; i < member.admin_of.length; i++) {
                            if (member.admin_of[i] == "") {
                                continue;
                            }

                            adminOfAppIds[adminOfAppIds.length] = require('mongodb').ObjectID(member.admin_of[i]);
                        }

                        for (var i = 0; i < member.user_of.length; i++) {
                            if (member.user_of[i] == "") {
                                continue;
                            }

                            userOfAppIds[userOfAppIds.length] = require('mongodb').ObjectID(member.user_of[i]);
                        }

                        db.collection('apps').find({_id: {'$in': adminOfAppIds}}).toArray(function (err, admin_of) {

                            for (var i = 0; i < admin_of.length; i++) {
                                apmGlobalApps[admin_of[i]["_id"]] = admin_of[i];
                                apmGlobalApps[admin_of[i]["_id"]]["_id"] = "" + admin_of[i]["_id"];
                            }

                            db.collection('apps').find({_id: {'$in': userOfAppIds}}).toArray(function (err, user_of) {
                                adminOfApps = admin_of;
                                userOfApps = user_of;

                                db.collection('graph_notes').find({_id: {'$in': userOfAppIds}}).toArray(function (err, notes) {
                                    var appNotes = [];
                                    for (var i = 0; i < notes.length; i++) {
                                        appNotes[notes[i]["_id"]] = notes[i]["notes"];
                                    }

                                    for (var i = 0; i < user_of.length; i++) {
                                        user_of[i]["notes"] = appNotes[user_of[i]["_id"]] || null;
                                        apmGlobalApps[user_of[i]["_id"]] = user_of[i];
                                        apmGlobalApps[user_of[i]["_id"]]["_id"] = "" + user_of[i]["_id"];
                                        apmGlobalApps[user_of[i]["_id"]].type = apmGlobalApps[user_of[i]["_id"]].type || "mobile";
                                    }

                                    renderDashboard();
                                });
                            });
                        });
                    }

                    var loadedThemes = {};
                    var curTheme;

                    function loadThemeFiles(theme, callback) {
                        //console.log(theme);
                        if (!loadedThemes[theme]) {
                            var tempThemeFiles = {css: [], js: []};
                            if (theme && theme.length) {
                                var themeDir = path.resolve(__dirname, "public/themes/" + theme + "/");
                                fs.readdir(themeDir, function (err, list) {
                                    if (err) {
                                        if (callback)
                                            callback(tempThemeFiles);
                                        return;
                                    }
                                    var ext;
                                    for (var i = 0; i < list.length; i++) {
                                        ext = list[i].split(".").pop();
                                        if (!tempThemeFiles[ext])
                                            tempThemeFiles[ext] = [];
                                        tempThemeFiles[ext].push(apmConfig.path + '/themes/' + theme + "/" + list[i]);
                                    }
                                    if (callback)
                                        callback(tempThemeFiles);
                                    loadedThemes[theme] = tempThemeFiles;
                                });
                            }
                            else if (callback)
                                callback(tempThemeFiles);
                        }
                        else if (callback)
                            callback(loadedThemes[theme]);
                    };


                    function renderDashboard() {
                        var configs = plugins.getConfig("frontend", member.settings);
                        // console.log('configs:' +  JSON.stringify(configs));
                        loadThemeFiles(configs.theme, function (theme) {
                            res.cookie("theme", configs.theme);
                            req.session.uid = member["_id"];
                            req.session.gadm = (member["global_admin"] == true);
                            req.session.email = member["email"];
                            req.session.settings = member.settings;
                            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

                            delete member["password"];

                            adminOfApps = sortBy(adminOfApps, member.appSortList || []);
                            userOfApps = sortBy(userOfApps, member.appSortList || []);

                            var defaultApp = userOfApps[0];
                            _.extend(req.config, configs);
                            var apmGlobal = {
                                countlyTitle: 'LingCoud', //COUNTLY_NAME
                                apps: apmGlobalApps,
                                defaultApp: defaultApp,
                                admin_apps: apmGlobalAdminApps,
                                csrf_token: req.session._csrf,
                                member: member,
                                config: req.config,
                                plugins: plugins.getPlugins(),
                                path: '', //apmConfig.path || "",
                                cdn: apmConfig.cdn || "",
                                message: req.flash("message")
                            };

                            var toDashboard = {
                                countlyTitle: APM_NAME,
                                adminOfApps: adminOfApps,
                                userOfApps: userOfApps,
                                defaultApp: defaultApp,
                                member: member,
                                intercom: apmConfig.web.use_intercom,
                                track: apmConfig.web.track || false,
                                installed: req.session.install || false,
                                cpus: require('os').cpus().length,
                                countlyVersion: APM_VERSION,
                                countlyType: APM_TYPE_CE,
                                countlyTrial: APM_TRIAL,
                                countlyTypeName: APM_NAMED_TYPE,
                                countlyTypeTrack: APM_TRACK_TYPE,
                                production: true, //configs.production || false,
                                plugins: plugins.getPlugins(),
                                config: req.config,
                                path: apmConfig.path || "",
                                cdn: apmConfig.cdn || "",
                                use_google: configs.use_google || false,
                                themeFiles: theme
                            };

                            if (req.session.install) {
                                req.session.install = null;
                                res.clearCookie('install');
                            }
                            plugins.callMethod("renderDashboard", {
                                req: req,
                                res: res,
                                next: next,
                                data: {
                                    member: member,
                                    adminApps: apmGlobalAdminApps,
                                    userApps: apmGlobalApps,
                                    countlyGlobal: apmGlobal,
                                    toDashboard: toDashboard
                                }
                            });

                            res.expose(apmGlobal, 'countlyGlobal');
                            console.log('toDashboard: ' + JSON.stringify(toDashboard));
                            toDashboard.production = false;
                            res.render('dashboard', toDashboard);
                        });
                    }
                }
                else {
                    if (req.session) {
                        req.session.uid = null;
                        req.session.gadm = null;
                        req.session.email = null;
                        req.session.settings = null;
                        res.clearCookie('uid');
                        res.clearCookie('gadm');
                        req.session.destroy(function () {
                        });
                    }
                    res.redirect(apmConfig.path + '/login');
                }
            });
        });
    }
});

router.get('/setup', function (req, res, next) {

    dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
        dbconnect.assert.equal(null, err);
        console.log("Connected correctly to server");

        db.collection('members').count({}, function (err, memberCount) {
            if (memberCount) {
                res.redirect('/login');
            } else {
                res.render('setup', {
                    countlyTitle: 'lingcloud',
                    countlyPage: '',
                    "csrf": req.session._csrf,
                    path: apmConfig.path || "",
                    cdn: apmConfig.cdn || "",
                    themeFiles: req.themeFiles
                });
            }
        });
    });
});

router.get('/login', function (req, res, next) {
    if (req.session.uid) {
        res.redirect('/dashboard');
    } else {
        dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
            dbconnect.assert.equal(null, err);
            console.log("Connected correctly to server");
            db.collection('members').count({}, function (err, memberCount) {
                if (memberCount) {
                    if (req.query.message) req.flash('info', req.query.message);
                    res.render('login', {
                        countlyTitle: 'LingCloud',
                        countlyPage: '',
                        "message": 'info',
                        "csrf": req.session._csrf,
                        path: '' || "",
                        cdn: '' || "",
                        themeFiles: req.themeFiles
                    });
                } else {
                    res.redirect('/setup');
                }
            });


        });

    }
});


router.get(apmConfig.path+'/forgot', function (req, res, next) {
    if (req.session.uid) {
        res.redirect(countlyConfig.path+'/dashboard');
    } else {
        res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, "message":req.flash('info'), path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
    }
});

router.get(apmConfig.path+'/reset/:prid', function (req, res, next) {
    if (req.params.prid) {
        countlyDb.collection('password_reset').findOne({prid:req.params.prid}, function (err, passwordReset) {
            var timestamp = Math.round(new Date().getTime() / 1000);

            if (passwordReset && !err) {
                if (timestamp > (passwordReset.timestamp + 600)) {
                    req.flash('info', 'reset.invalid');
                    res.redirect(countlyConfig.path+'/forgot');
                } else {
                    res.render('reset', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, "prid":req.params.prid, "message":"", path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
                }
            } else {
                req.flash('info', 'reset.invalid');
                res.redirect(countlyConfig.path+'/forgot');
            }
        });
    } else {
        req.flash('info', 'reset.invalid');
        res.redirect(countlyConfig.path+'/forgot');
    }
});

router.post(apmConfig.path+'/reset', function (req, res, next) {
    if (req.body.password && req.body.again && req.body.prid) {
        var password = sha1Hash(req.body.password);

        countlyDb.collection('password_reset').findOne({prid:req.body.prid}, function (err, passwordReset) {
            countlyDb.collection('members').findAndModify({_id:passwordReset.user_id}, {}, {'$set':{ "password":password }}, function (err, member) {
                member = member && member.ok ? member.value : null;
                plugins.callMethod("passwordReset", {req:req, res:res, next:next, data:member});
                req.flash('info', 'reset.result');
                res.redirect(countlyConfig.path+'/login');
            });

            countlyDb.collection('password_reset').remove({prid:req.body.prid}, function () {});
        });
    } else {
        res.render('reset', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "csrf":req.session._csrf, "prid":req.body.prid, "message":"", path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
    }
});

router.post(apmConfig.path+'/forgot', function (req, res, next) {
    if (req.body.email) {
        countlyDb.collection('members').findOne({"email":req.body.email}, function (err, member) {
            if (member) {
                var timestamp = Math.round(new Date().getTime() / 1000),
                    prid = sha1Hash(member.username + member.full_name, timestamp);
                member.lang = member.lang || req.body.lang || "en";
                countlyDb.collection('password_reset').insert({"prid":prid, "user_id":member._id, "timestamp":timestamp}, {safe:true}, function (err, password_reset) {
                    countlyMail.sendPasswordResetInfo(member, prid);
                    plugins.callMethod("passwordRequest", {req:req, res:res, next:next, data:req.body});
                    res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE, "message":"forgot.result", "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
                });
            } else {
                res.render('forgot', { countlyTitle:COUNTLY_NAME, countlyPage:COUNTLY_PAGE,"message":"forgot.result", "csrf":req.session._csrf, path:countlyConfig.path || "", cdn:countlyConfig.cdn || "", themeFiles:req.themeFiles });
            }
        });
    } else {
        res.redirect(countlyConfig.path+'/forgot');
    }
});

router.post(apmConfig.path + '/setup', function (req, res, next) {
    dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
        db.collection('members').count({}, function (err, memberCount) {
            if (memberCount) {
                res.redirect(apmConfig.path + '/login');
            } else {
                if (req.body.full_name && req.body.username && req.body.password && req.body.email) {
                    var password = sha1Hash(req.body.password);

                    var doc = {
                        "full_name": req.body.full_name,
                        "username": req.body.username,
                        "password": password,
                        "email": req.body.email,
                        "global_admin": true
                    };
                    if (req.body.lang)
                        doc.lang = req.body.lang;
                    db.collection('members').insertOne(doc, {safe: true}, function (err, member) {
                        member = member.ops;
                        if (apmConfig.web.use_intercom) {
                            var options = {
                                uri: "https://cloud.count.ly/s",
                                method: "POST",
                                timeout: 4E3,
                                json: {
                                    email: req.body.email,
                                    full_name: req.body.full_name,
                                    v: APM_VERSION,
                                    t: APM_TYPE
                                }
                            };
                            request(options, function (a, c, b) {
                                a = {};
                                a.api_key = md5Hash(member[0]._id + (new Date).getTime());
                                b && (b.in_user_id && (a.in_user_id = b.in_user_id), b.in_user_hash && (a.in_user_hash = b.in_user_hash));

                                db.collection("members").updateOne({_id: member[0]._id}, {$set: a}, function (err, mem) {
                                    plugins.callMethod("setup", {req: req, res: res, next: next, data: member[0]});
                                    req.session.uid = member[0]._id;
                                    req.session.gadm = !0;
                                    req.session.email = member[0].email;
                                    req.session.install = true;
                                    res.redirect(countlyConfig.path + "/dashboard")
                                })
                            });
                        } else {
                            a = {};
                            a.api_key = md5Hash(member[0]._id + (new Date).getTime());

                            db.collection("members").updateOne({_id: member[0]._id}, {$set: a}, function () {
                                req.session.uid = member[0]._id;
                                req.session.gadm = !0;
                                req.session.email = member[0].email;
                                req.session.install = true;
                                res.redirect(apmConfig.path + "/dashboard")
                            })
                        }
                    });
                } else {
                    res.redirect(apmConfig.path + '/setup');
                }
            }
        });
    });
});



router.post(apmConfig.path+'/login', function (req, res, next) {
    if (req.body.username && req.body.password) {
        var password = sha1Hash(req.body.password);
        dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
            var searchStr = {
                $or: [{"username": req.body.username}, {"email": req.body.username}],
                "password": password
            };
            db.collection('members').find(searchStr).toArray(function (err, members) {
                if (members.length === 1) {
                    var member = members[0];

                if (member) {
                    plugins.callMethod("loginSuccessful", {req: req, res: res, next: next, data: member});

                    req.session.uid = member["_id"];
                    req.session.gadm = (member["global_admin"] == true);
                    req.session.email = member["email"];
                    req.session.settings = member.settings;
                    if (req.body.lang && req.body.lang != member["lang"]) {
                        db.collection('members').update({_id: member["_id"]}, {$set: {lang: req.body.lang}}, function () {
                        });
                    }
                    if (plugins.getConfig("frontend", member.settings).session_timeout)
                        req.session.expires = Date.now() + plugins.getConfig("frontend", member.settings).session_timeout;
                    res.redirect(apmConfig.path + '/dashboard');
                } else {
                    plugins.callMethod("loginFailed", {req: req, res: res, next: next, data: req.body});
                    res.redirect(apmConfig.path + '/login?message=login.result');
                }
            }
            });
        });
    } else {
        res.redirect(apmConfig.path+'/login?message=login.result');
    }
});



var authutils = require('../service/authutils');

// Before any of the relevant routes...
//app.use('/api-requiring-auth', authutils.basicAuth('username', 'password'));

var auth = authutils.basicAuth(function(user, pass, callback) {
    var password = sha1Hash(pass);
    countlyDb.collection('members').findOne({$or: [ {"username":user}, {"email":user} ], "password":password}, function (err, member) {
        if(member)
            callback(null, member);
        else
            callback("err", user);
    });
});



router.get(apmConfig.path+'/api-key', auth, function (req, res, next) {
    if (req.user && req.user._id) {
        plugins.callMethod("apikeySuccessful", {req:req, res:res, next:next, data:req.user});
        res.send(req.user.api_key);
    } else {
        plugins.callMethod("apikeyFailed", {req:req, res:res, next:next, data:{username:req.user}});
        res.send("-1");
    }
});

router.post(apmConfig.path+'/mobile/login', function (req, res, next) {
    if (req.body.username && req.body.password) {
        var password = sha1Hash(req.body.password);

        countlyDb.collection('members').findOne({$or: [ {"username":req.body.username}, {"email":req.body.username} ], "password":password}, function (err, member) {
            if (member) {
                plugins.callMethod("mobileloginSuccessful", {req:req, res:res, next:next, data:member});
                res.render('mobile/key', { "key": member.api_key || -1 });
            } else {
                plugins.callMethod("mobileloginFailed", {req:req, res:res, next:next, data:req.body});
                res.render('mobile/login', { "message":"login.result", "csrf":req.session._csrf });
            }
        });
    } else {
        res.render('mobile/login', { "message":"login.result", "csrf":req.session._csrf });
    }
});

router.post(apmConfig.path+'/dashboard/settings', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var newAppOrder = req.body.app_sort_list;

    if (!newAppOrder || newAppOrder.length == 0) {
        res.end();
        return false;
    }

    countlyDb.collection('members').update({_id:countlyDb.ObjectID(req.session.uid)}, {'$set':{'appSortList':newAppOrder}}, {'upsert':true}, function(){
        res.end();
        return false;
    });
});

router.post(apmConfig.path+'/apps/icon', function (req, res, next) {
    if (!req.files.app_image || !req.body.app_image_id) {
        res.end();
        return true;
    }
console.log('apps/icon');
    var tmp_path = req.files.app_image.path,
        target_path = __dirname + '/public/appimages/' + req.body.app_image_id + ".png",
        type = req.files.app_image.type;

    if (type != "image/png" && type != "image/gif" && type != "image/jpeg") {
        fs.unlink(tmp_path, function () {});
        res.send(false);
        return true;
    }
    plugins.callMethod("iconUpload", {req:req, res:res, next:next, data:req.body});
    fs.rename(tmp_path, target_path, function (err) {
        fs.unlink(tmp_path, function () {});
        sharp(target_path)
            .resize(72, 72)
            .embed()
            .toFile(target_path, function(err) {});

        res.send(apmConfig.path+"/appimages/" + req.body.app_image_id + ".png");
    });
});

router.post(apmConfig.path+'/user/settings', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.username && req.body.api_key) {
        updatedUser.username = req.body["username"];
        updatedUser.api_key = req.body["api_key"];
        if (req.body.lang) {
            updatedUser.lang = req.body.lang;
        }

        countlyDb.collection('members').findOne({username:req.body.username}, function (err, member) {
            if ((member && member._id != req.session.uid) || err) {
                res.send("username-exists");
            } else {
                if (req.body.old_pwd) {
                    var password = sha1Hash(req.body.old_pwd),
                        newPassword = sha1Hash(req.body.new_pwd);

                    updatedUser.password = newPassword;
                    plugins.callMethod("userSettings", {req:req, res:res, next:next, data:member});
                    countlyDb.collection('members').update({"_id":countlyDb.ObjectID(req.session.uid), "password":password}, {'$set':updatedUser}, {safe:true}, function (err, member) {
                        if (member && !err) {
                            res.send(true);
                        } else {
                            res.send(false);
                        }
                    });
                } else {
                    countlyDb.collection('members').update({"_id":countlyDb.ObjectID(req.session.uid)}, {'$set':updatedUser}, {safe:true}, function (err, member) {
                        if (member && !err) {
                            res.send(true);
                        } else {
                            res.send(false);
                        }
                    });
                }
            }
        });
    } else {
        res.send(false);
        return false;
    }
});

router.post(apmConfig.path+'/user/settings/lang', function (req, res, next) {
    if (!req.session.uid) {
        res.end();
        return false;
    }

    var updatedUser = {};

    if (req.body.username && req.body.lang) {
        updatedUser.lang = req.body.lang;

        countlyDb.collection('members').findOne({username:req.body.username}, function (err, member) {
            if ((member && member._id != req.session.uid) || err) {
                res.send("username-exists");
            } else {
                countlyDb.collection('members').update({"_id":countlyDb.ObjectID(req.session.uid)}, {'$set':updatedUser}, {safe:true}, function (err, member) {
                    if (member && !err) {
                        res.send(true);
                    } else {
                        res.send(false);
                    }
                });
            }
        });
    } else {
        res.send(false);
        return false;
    }
});

router.post(apmConfig.path+'/users/check/email', function (req, res, next) {
    if (!req.session.uid || !isGlobalAdmin(req) || !req.body.email) {
        res.send(false);
        return false;
    }

    countlyDb.collection('members').findOne({email:req.body.email}, function (err, member) {
        if (member || err) {
            res.send(false);
        } else {
            res.send(true);
        }
    });
});

router.post(apmConfig.path+'/users/check/username', function (req, res, next) {
    if (!req.session.uid || !isGlobalAdmin(req) || !req.body.username) {
        res.send(false);
        return false;
    }

    countlyDb.collection('members').findOne({username:req.body.username}, function (err, member) {
        if (member || err) {
            res.send(false);
        } else {
            res.send(true);
        }
    });
});

router.post(apmConfig.path+'/events/map/edit', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id) {
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.admin_of && member.admin_of.indexOf(req.body.app_id) != -1) {
                countlyDb.collection('events').update({"_id":countlyDb.ObjectID(req.body.app_id)}, {'$set':{"map":req.body.event_map, "order":req.body.event_order}}, function (err, events) {
                });
                res.send(true);
                return true;
            } else {
                res.send(false);
                return false;
            }
        });
    } else {
        countlyDb.collection('events').update({"_id":countlyDb.ObjectID(req.body.app_id)}, {'$set':{"map":req.body.event_map, "order":req.body.event_order}}, function (err, events) {
        });
        res.send(true);
        return true;
    }
});

function deleteEvent(req, event_key, app_id, callback){
    var updateThese = {
        "$unset": {},
        "$pull": {
            "list": event_key,
            "order": event_key
        }
    };

    if(event_key.indexOf('.') != -1){
        updateThese["$unset"]["map." + event_key.replace(/\./g,':')] = 1;
        updateThese["$unset"]["segments." + event_key.replace(/\./g,':')] = 1;
    }
    else{
        updateThese["$unset"]["map." + event_key] = 1;
        updateThese["$unset"]["segments." + event_key] = 1;
    }

    var collectionNameWoPrefix = crypto.createHash('sha1').update(event_key + app_id).digest('hex');
    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.admin_of && member.admin_of.indexOf(app_id) != -1) {
                countlyDb.collection('events').update({"_id":countlyDb.ObjectID(app_id)}, updateThese, function (err, events) {
                    if(callback)
                        callback(true);
                });
                countlyDb.collection("events" + collectionNameWoPrefix).drop();
                return true;
            } else {
                if(callback)
                    callback(false);
                return false;
            }
        });
    } else {
        countlyDb.collection('events').update({"_id":countlyDb.ObjectID(app_id)}, updateThese, function (err, events) {
            if(callback)
                callback(true);
        });
        countlyDb.collection("events" + collectionNameWoPrefix).drop();
        return true;
    }
}

router.post(apmConfig.path+'/events/delete', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.event_key) {
        res.end();
        return false;
    }

    deleteEvent(req, req.body.event_key, req.body.app_id, function(result){
        res.send(result);
    })
});

router.post(apmConfig.path+'/events/delete_multi', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.events) {
        res.end();
        return false;
    }
    req.body.events = JSON.parse(req.body.events);
    async.each(req.body.events, function(key, callback){
        deleteEvent(req, key, req.body.app_id, function(result){
            callback();
        })
    }, function(err, results) {
        res.send(true);
    });
});

router.post(apmConfig.path+'/graphnotes/create', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.date_id || !req.body.note || req.body.note.length > 50) {
        res.send(false);
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.user_of && member.user_of.indexOf(req.body.app_id) != -1) {
                createNote();
                return true;
            } else {
                res.send(false);
                return false;
            }
        });
    } else {
        createNote();
        return true;
    }

    function createNote() {
        var noteObj = {},
            sanNote = stringJS(req.body.note).stripTags().s;

        noteObj["notes." + req.body.date_id] = sanNote;

        countlyDb.collection('graph_notes').update({"_id": countlyDb.ObjectID(req.body.app_id)}, { $addToSet: noteObj }, {upsert: true}, function(err, res) {});
        res.send(sanNote);
    }
});

router.post(apmConfig.path+'/graphnotes/delete', function (req, res, next) {
    if (!req.session.uid || !req.body.app_id || !req.body.date_id || !req.body.note) {
        res.end();
        return false;
    }

    if (!isGlobalAdmin(req)) {
        countlyDb.collection('members').findOne({"_id":countlyDb.ObjectID(req.session.uid)}, function (err, member) {
            if (!err && member.user_of && member.user_of.indexOf(req.body.app_id) != -1) {
                deleteNote();
                return true;
            } else {
                res.send(false);
                return false;
            }
        });
    } else {
        deleteNote();
        return true;
    }

    function deleteNote() {
        var noteObj = {};
        noteObj["notes." + req.body.date_id] = req.body.note;

        countlyDb.collection('graph_notes').update({"_id": countlyDb.ObjectID(req.body.app_id)}, { $pull: noteObj }, function(err, res) {});
        res.send(true);
    }
});

module.exports = router;