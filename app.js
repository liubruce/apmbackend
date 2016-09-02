var log4js = require('log4js');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var log = log4js.getLogger("app");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expose = require('express-expose');

var routes = require('./routes/index');
var users = require('./routes/users');
var apiformobile = require('./routes/apiformobile');
var app = express();

var dbconnect = require('./dbconfig/dbconnect');
var apmConfig = require('./config/config', 'dont-enclose');
var flash = require('connect-flash');

//var servestatic = require('serve-static');
var multer = require('multer');
var methodOverride = require('method-override');
var csurf = require('csurf');

var pluginManager = require('./plugins/pluginManager.js');

pluginManager.setConfigs("frontend", {
    production: false,
    theme: "",
    session_timeout: 30 * 60 * 1000,
    use_google: false,
    code: true
});

pluginManager.setUserConfigs("frontend", {
    production: false,
    theme: false,
    session_timeout: false,
    use_google: false,
    code: false
});

process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
});

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
});

var countlyDb = pluginManager.dbConnection(apmConfig);


var loadedThemes = {};
var curTheme;
app.loadThemeFiles = function (theme, callback) {
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

pluginManager.loadConfigs(countlyDb, function () {
    curTheme = pluginManager.getConfig("frontend").theme;
    app.loadThemeFiles(pluginManager.getConfig("frontend").theme);
});

app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('view options', {layout: false});


//app.use(apmConfig.path + '/mobile', express.static(__dirname + '/plugins/mobile/frontend/public', {maxAge: oneYear}));
//app.use(apmConfig.path + '/web', express.static(__dirname + '/plugins/web/frontend/public', {maxAge: oneYear}));

//app.use(express.static(path.join(__dirname, 'public')));

//console.log('app js start');
pluginManager.loadAppStatic(app, countlyDb, express);

app.use(cookieParser());

//server theme images


app.use(function (req, res, next) {
    if (req.url.indexOf(apmConfig.path + '/images/') === 0) {
        var url = req.url.replace(apmConfig.path, "");
        var theme = req.cookies.theme || curTheme;
        if (theme && theme.length) {
            fs.exists(__dirname + '/public/themes/' + theme + url, function (exists) {
                if (exists) {
                    res.sendfile(__dirname + '/public/themes/' + theme + url);
                } else {
                    next();
                }
            });
        }
        else { //serve default location
            next();
        }
    }
    else {
        next();
    }
});

var oneYear = 31557600000;

app.use(apmConfig.path, express.static(__dirname + '/public', {maxAge: oneYear}));

var tempPlugins = pluginManager.getPlugins();

for (var i = 0, l = tempPlugins.length; i < l; i++) {
    app.use(apmConfig.path + '/' + tempPlugins[i], express.static(__dirname + '/plugins/' + tempPlugins[i] + "/frontend/public", {maxAge: 31557600000}));
}

var session = require('express-session');
const MongoStore = require('connect-mongo')(session);


app.use(session({
    secret: 'LingCloudAPM',
    resave: true,
    name: 'LingCloudAPM',
    cookie: {maxAge: 80000},
    saveUninitialized: true,
    store: new MongoStore({url: 'mongodb://localhost:27017/lingcloudapm'})
}));


//app.use(bodyParser({uploadDir: __dirname + '/uploads'}));

app.use(flash());


app.use(function (req, res, next) {
    pluginManager.loadConfigs(countlyDb, function () {
        curTheme = pluginManager.getConfig("frontend").theme;
        app.loadThemeFiles(req.cookies.theme || pluginManager.getConfig("frontend").theme, function (themeFiles) {
            res.locals.flash = req.flash.bind(req);
            req.config = pluginManager.getConfig("frontend");
            req.themeFiles = themeFiles;
            var _render = res.render;
            res.render = function (view, opts, fn, parent, sub) {
                if (!opts["path"])
                    opts["path"] = apmConfig.path || "";
                if (!opts["cdn"])
                    opts["cdn"] = apmConfig.cdn || "";
                if (!opts["themeFiles"])
                    opts["themeFiles"] = themeFiles;
                _render.call(res, view, opts, fn, parent, sub);
            };
            next();
        });
    });
});

//app.use(express.methodOverride());
app.use(methodOverride('X-HTTP-Method-Override'));

/*
 var csurf = require('csurf');

 app.use(function (req, res, next) {
 if (req.method == "GET" || req.method == 'HEAD' || req.method == 'OPTIONS') {
 //csrf not used, but lets regenerate token
 csurf(req, res, next);
 }
 else if (!plugins.callMethod("skipCSRF", {req: req, res: res, next: next})) {
 //none of the plugins requested to skip csrf for this request
 csurf(req, res, next);
 } else {
 //skipping csrf step, some plugin needs it without csrf
 next();
 }
 });

*/


pluginManager.loadAppPlugins(app, countlyDb, express);

app.use(favicon(__dirname + '/public/images/favicon.png'));

// uncomment after placing your favicon in /public
app.use(logger('dev'));

app.use(log4js.connectLogger(log4js.getLogger("http"), {level: 'auto'}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//app.use(multer());


app.use(express.static(path.join(__dirname, 'public')));


app = expose(app);


//app.use(app.router);


app.use('/', routes);
app.use('/users', users);
app.use('/', apiformobile);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        log.error("Something went wrong:", err);
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    log.error("Something went wrong:", err);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
