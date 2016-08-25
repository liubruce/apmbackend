var express = require('express');
var router = express.Router(),
    crypto = require('crypto');
var log = require('log4js').getLogger("index");
var accessdb = require('../service/accessdb');
var dbconnect = require('../dbconfig/dbconnect');
var apmConfig = require('../config/config', 'dont-enclose');
var apmStats = require('../api/parts/data/stats.js');

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

/* GET home page. */
router.get('/', function (req, res, next) {
    log.debug('访问了主页');

    res.redirect('/login');
    // accessdb.createUser(req, res);
    res.render('index', {title: '应用性能管理'});

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
                    //if (req.query.message) req.flash('info', req.query.message);
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
                                    v: COUNTLY_VERSION,
                                    t: COUNTLY_TYPE
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

router.post(apmConfig.path + '/login', function (req, res, next) {
    if (req.body.username && req.body.password) {
        var password = sha1Hash(req.body.password);
        dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
            var searchStr = {
                $or: [{"username": req.body.username}, {"email": req.body.username}],
                "password": password
            };
            console.log(searchStr);
            db.collection('members').find(searchStr).toArray(function (err, members) {
                if (members.length === 1) {
                    var member = members[0];
                    if (member) {
                        //console.dir(member);
                        //console.log(member._id);

                        //console.log('member:' + member.toString());
                        //console.log('member8888:' + member["_id"]);
                        //plugins.callMethod("loginSuccessful", {req:req, res:res, next:next, data:member});
                        /*
                         if (apmConfig.web.use_intercom && member['global_admin']) {
                         apmStats.getOverall(db, function (statsObj) {
                         request({
                         uri: "https://cloud.count.ly/s",
                         method: "POST",
                         timeout: 4E3,
                         json: {
                         email: member.email,
                         full_name: member.full_name,
                         v: COUNTLY_VERSION,
                         t: COUNTLY_TYPE,
                         u: statsObj["total-users"],
                         e: statsObj["total-events"],
                         a: statsObj["total-apps"],
                         m: statsObj["total-msg-users"],
                         mc: statsObj["total-msg-created"],
                         ms: statsObj["total-msg-sent"]
                         }
                         }, function (a, c, b) {
                         a = {};
                         b && (b.in_user_id && !member.in_user_id && (a.in_user_id = b.in_user_id), b.in_user_hash && !member.in_user_hash && (a.in_user_hash = b.in_user_hash));
                         Object.keys(a).length && db.collection("members").update({_id: member._id}, {$set: a}, function () {
                         })
                         });
                         });
                         }
                         if (!apmConfig.web.track || apmConfig.web.track == "GA" && member['global_admin'] || apmConfig.web.track == "noneGA" && !member['global_admin']) {
                         apmStats.getUser(db, member, function (statsObj) {
                         var date = new Date();
                         request({
                         uri: "https://stats.count.ly/i",
                         method: "GET",
                         timeout: 4E3,
                         qs: {
                         device_id: member.email,
                         app_key: "386012020c7bf7fcb2f1edf215f1801d6146913f",
                         timestamp: Math.round(date.getTime() / 1000),
                         hour: date.getHours(),
                         dow: date.getDay(),
                         user_details: JSON.stringify(
                         {
                         custom: {
                         apps: (member.user_of) ? member.user_of.length : 0,
                         platforms: {"$addToSet": statsObj["total-platforms"]},
                         events: statsObj["total-events"],
                         pushes: statsObj["total-msg-sent"],
                         crashes: statsObj["total-crash-groups"],
                         users: statsObj["total-users"]
                         }
                         }
                         )

                         }
                         }, function (a, c, b) {
                         });
                         });
                         }

                         */
                        //console.log('member8888:' + member["_id"]);
                        req.session.uid = member["_id"];
                        console.log('session uid:' + req.session.uid);
                        req.session.gadm = (member["global_admin"] == true);
                        req.session.email = member["email"];
                        req.session.settings = member.settings;
                        console.log('lang:' + req.body.lang);

                        if (req.body.lang && req.body.lang != member["lang"]) {
                            dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
                                db.collection('members').updateOne({_id: member["_id"]}, {$set: {lang: req.body.lang}}, function () {
                                    db.close();
                                });
                            });
                        }
                        //if (plugins.getConfig("frontend", member.settings).session_timeout)
                        //    req.session.expires = Date.now() + plugins.getConfig("frontend", member.settings).session_timeout;
                        res.redirect(apmConfig.path + '/dashboard');
                    }
                    else {
                        //plugins.callMethod("loginFailed", {req: req, res: res, next: next, data: req.body});
                        res.redirect(apmConfig.path + '/login?message=login.result');
                    }

                }
                db.close();
            });

        });
    }
    else {
        res.redirect(apmConfig.path + '/login?message=login.result');
    }
});


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
    console.log('uid: ' + req.session.uid);
    if (!req.session.uid) {
        res.redirect(apmConfig.path + '/login');
    } else {
        dbconnect.MongoClient.connect(dbconnect.dburl, function (err, db) {
            var searchStr = {"_id": require('mongodb').ObjectID(req.session.uid)};
            console.log(searchStr);
            db.collection('members').find(searchStr).toArray(function (err, members) { //db.ObjectID(
                var member;
                console.dir(members);
                if (members.length === 1) var member = members[0];

                console.dir(member);
                console.log(member._id);

                if (member) {
                    var adminOfApps = [],
                        userOfApps = [],
                        apmGlobalApps = {},
                        apmGlobalAdminApps = {};

                    console.log('global_admin:' + member['global_admin']);

                    if (member['global_admin']) {
                        db.collection('apps').find({}).toArray(function (err, apps) {
                            adminOfApps = apps;
                            userOfApps = apps;
                            console.dir('apps:' + apps);
                            db.collection('graph_notes').find().toArray(function (err, notes) {
                                var appNotes = [];
                                for (var i = 0; i < notes.length; i++) {
                                    appNotes[notes[i]["_id"]] = notes[i]["notes"];
                                }

                                for (var i = 0; i < apps.length; i++) {
                                    apps[i].type = apps[i].type || "mobile";
                                    apps[i]["notes"] = appNotes[apps[i]["_id"]] || null;
                                    countlyGlobalApps[apps[i]["_id"]] = apps[i];
                                    countlyGlobalApps[apps[i]["_id"]]["_id"] = "" + apps[i]["_id"];
                                }

                                apmGlobalAdminApps = apmGlobalApps;
                                renderDashboard();
                            });
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

                            adminOfAppIds[adminOfAppIds.length] = countlyDb.ObjectID(member.admin_of[i]);
                        }

                        for (var i = 0; i < member.user_of.length; i++) {
                            if (member.user_of[i] == "") {
                                continue;
                            }

                            userOfAppIds[userOfAppIds.length] = countlyDb.ObjectID(member.user_of[i]);
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

                    function renderDashboard() {
                        //var configs = plugins.getConfig("frontend", member.settings);
                       // app.loadThemeFiles(configs.theme, function (theme) {
                            //res.cookie("theme", configs.theme);
                            req.session.uid = member["_id"];
                            req.session.gadm = (member["global_admin"] == true);
                            req.session.email = member["email"];
                            req.session.settings = member.settings;
                            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

                            delete member["password"];

                            adminOfApps = sortBy(adminOfApps, member.appSortList || []);
                            userOfApps = sortBy(userOfApps, member.appSortList || []);

                            var defaultApp = userOfApps[0];
                            //_.extend(req.config, configs);
                            var apmGlobal = {
                                countlyTitle: 'lingcloud',
                                apps: apmGlobalApps,
                                defaultApp: defaultApp,
                                admin_apps: apmGlobalAdminApps,
                                csrf_token: req.session._csrf,
                                member: member,
                                config: req.config,
                                plugins: '', //plugins.getPlugins(),
                                path: apmConfig.path || "",
                                cdn: apmConfig.cdn || "",
                                message: '' //req.flash("message")
                            };

                            var toDashboard = {
                                countlyTitle: '',
                                adminOfApps: adminOfApps,
                                userOfApps: userOfApps,
                                defaultApp: defaultApp,
                                member: member,
                                intercom: apmConfig.web.use_intercom,
                                track: apmConfig.web.track || false,
                                installed: req.session.install || false,
                                cpus: require('os').cpus().length,
                                countlyVersion: '',
                                countlyType: '',
                                countlyTrial: '',
                                countlyTypeName: '',
                                countlyTypeTrack: '',
                                production: false, //configs.production || false,
                                plugins: '',//plugins.getPlugins(),
                                config: req.config,
                                path: apmConfig.path || "",
                                cdn: apmConfig.cdn || "",
                                use_google: '' || false,
                                themeFiles: ''
                            };

                            if (req.session.install) {
                                req.session.install = null;
                                res.clearCookie('install');
                            }
                        /*
                            plugins.callMethod("renderDashboard", {
                                req: req,
                                res: res,
                                next: next,
                                data: {
                                    member: member,
                                    adminApps: countlyGlobalAdminApps,
                                    userApps: countlyGlobalApps,
                                    countlyGlobal: countlyGlobal,
                                    toDashboard: toDashboard
                                }
                            });*/

                            //res.expose(apmGlobal, 'countlyGlobal');
                           // console.log('toDashboard: ' + toDashboard);
                            //toDashboard.production = true;
                            res.render('dashboard', toDashboard);
                       // });
                    }
                } else {
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


router.get('/session', function (req, res) {
    console.log(req.session);

    // 检查 session 中的 isVisit 字段
    // 如果存在则增加一次，否则为 session 设置 isVisit 字段，并初始化为 1。
    if (req.session.isVisit) {
        req.session.isVisit++;
        res.send('<p>第 ' + req.session.isVisit + '次来此页面</p>');
    } else {
        req.session.isVisit = 1;
        res.send("欢迎第一次来这里");
        console.log(req.session);
    }
});


module.exports = router;