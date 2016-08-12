/**
 * Created by bruceliu on 16/8/12.
 */

var connection = require('../database/dbsource');


function writeDeviceInfo(currentTime, statusCode, responseTime, taskid, availrate, correctrate,monitorid) {


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


module.exports.writeDeviceInfo = writeDeviceInfo;
