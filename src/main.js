'use strict';

var RemoteAnalytics, module;

RemoteAnalytics = {
    /**
     * Configuration object
     */
    config: {
        /**
         * API endpoint to post data to
         */
        apiUrl: '',
        /**
         * ID of the device posting data
         */
        deviceId: 'device-id',
        /**
         * ID of the project for which data is posted
         * Generated when creating an app in the backend
         */
        projectId: 'project-id'
    },
    /**
     * Sessions data
     */
    sessions: [],
    /**
     * API auth token
     */
    token: null,
    /**
     * Initialize configuration
     *
     * @param config
     */
    init: function (config) {
        //jQuery.extend(this.config, config);
        for (var c in config) {
            this.config[c] = config[c];
        }
    },
    mergeObjects: function (obj1, obj2) {
        var obj = {};

        for (var o in obj1) {
            obj[o] = obj1[o];
        }

        for (var o in obj2) {
            obj[o] = obj2[o];
        }

        return obj;
    },
    /**
     * Send API request
     * 
     * @param object conf
     * @returns void
     */
    apiRequest: function (conf) {
        var request = new XMLHttpRequest;

        // Handle response
        request.onreadystatechange = function () {
            if (4 === request.readyState) {
                var res = JSON.parse(request.responseText);
                var data = {};
                switch (request.status) {
                    case 200:
                    {
                        data = RemoteAnalytics.mergeObjects(data, res);
                        break;
                    }
                    default:
                    {
                        data.error = res.error;
                        break;
                    }
                }
                ;
                if (conf.callback !== undefined) {
                    conf.callback(data);
                }
            }
        };

        // Create request
        request.open(conf.method, conf.url);

        // Set request headers
        if (conf.headers !== undefined) {
            for (var h in conf.headers) {
                var header = conf.headers[h];
                request.setRequestHeader(h, header);
            }
        }

        // Serialize data
        var data = '';
        for (var d in conf.data) {
            if (data.length > 0) {
                data += '&';
            }
            data += d + '=' + conf.data[d];
        }

        // Send request
        request.send(data);
    },
    /**
     * 
     * @returns JSON
     */
    getApiData: function (endpoint, callback) {
        this.apiRequest({
            url: this.config.apiUrl + '/' + endpoint,
            method: 'GET',
            headers: {
                'X-AUTH-TOKEN': this.token,
                'Content-Type': 'application/json'
            },
            callback: function (response) {
                callback(response);
            }
        });
    },
    /**
     * Login
     */
    login: function (callback, data) {
        if (data === undefined) {
            data = {};
        }
        this.apiRequest({
            url: this.config.apiUrl + '/login',
            method: 'POST',
            data: RemoteAnalytics.mergeObjects({
                username: this.config.deviceId,
                password: this.config.authKey
            }, data),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            callback: function (response) {
                if (response.token !== undefined) {
                    RemoteAnalytics.token = response.token;
                }
                callback(response);
            }
        });
    },
    /**
     * Log session action
     *
     * @param name
     * @param value
     * @param extra
     * @returns {Number}
     */
    logAction: function (name, value, extra) {
        if (this.sessions.length < 1) {
            this.submissionStart();
        }
        var action = {
            name: name,
            value: value,
            extra: extra,
            time: Math.round(Date.now() / 1000)
        };
        return this.sessions[this.sessions.length - 1].actions.push(action);
    },
    /**
     * Start submission session
     */
    submissionStart: function () {
        var session = {
            'story': this.config.projectId,
            'start_time': Math.round(Date.now() / 1000),
            'end_time': 0,
            'actions': []
        };
        this.sessions.push(session);
    },
    /**
     * End submission session
     *
     * May span multiple app sessions
     *
     * @param callbackNoSessions
     * @param callbackAfterPost
     */
    submissionEnd: function (callbackNoSessions, callbackAfterPost) {
        if (this.sessions.length < 1) {
            this.sessions = [];
            callbackNoSessions();
            return;
        }

        this.sessions[this.sessions.length - 1].end_time = Math.round(Date.now() / 1000);

        jQuery.ajax({
            url: this.apiUrl + '/devices/' + this.deviceId,
            method: 'POST',
            data: {
                sessions: this.sessions
            },
            headers: {
                'Authorization': this.token,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            success: function () {
                callbackAfterPost();
                this.sessions = [];
            },
            error: function () {
                callbackAfterPost();
            }
        });
    }
};

if (module !== undefined) {
    module.exports = RemoteAnalytics;
}
