'use strict';

var module, RemoteAnalytics;

RemoteAnalytics = {
    /**
     * Configuration object
     */
    config: {
        /**
         * API endpoint to post data to
         *
         * Needs to be set in config file
         */
        apiUrl: '',
        /**
         * API endpoint to post data to
         *
         * Needs to be set in config file
         */
        socketUrl: null,
        /**
         * ID of the device posting data
         *
         * Will be set from login response
         */
        deviceId: 'device-id',
        /**
         * Name of the device
         *
         * Needs to be set in config file
         */
        deviceName: 'device-name',
        /**
         * IP address of the device
         *
         * Will be set from login response
         */
        deviceIp: '1.2.3.4',
        /**
         * ID of the project for which data is posted
         *
         * Needs to be set in config file
         *
         * Generated when creating an app in the manager (slug of the project name)
         */
        projectId: 'project-id',
        /**
         * Ping interval (in seconds)
         */
        pingInterval: 60,
        /**
         * Enable keepaline
         *
         * If might be desirable to disable keepalive
         * for client mobile apps that are not always on
         */
        doKeepAline: true
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
     * Socket object
     */
    socket: null,
    /**
     * ID of the socket
     */
    socketClientId: null,
    /**
     * Keepaline ping timer
     */
    pingTimer: null,
    /**
     * Connection flag
     */
    connected: false,
    /**
     * Initialize configuration
     *
     * @param config
     * @param socket
     */
    init: function (config, socket) {
        //jQuery.extend(this.config, config);
        for (var c in config) {
            if(config.hasOwnProperty(c)) {
                this.config[c] = config[c];
            }
        }

        if(socket !== null) {
            this.socket = socket;

            this.socket.on('connect', function () {
                RemoteAnalytics.connected = true;

                if (!this.token) {
                    RemoteAnalytics.login(function (response) {
                        if (response.error !== undefined) {
                            console.log(response.error);
                        }
                        else {
                            if (RemoteAnalytics.config.doKeepAline) {
                                RemoteAnalytics.ping();

                                RemoteAnalytics.pingTimer = setInterval(function () {
                                    RemoteAnalytics.ping();
                                }, RemoteAnalytics.config.pingInterval * 1000); // Ping every 60 seconds
                            }
                        }
                    });
                }
            });
            this.socket.on('socket-client-id', function (response) {
                RemoteAnalytics.socketClientId = response.id;
            });
            this.socket.on('disconnect', function () {
                RemoteAnalytics.connected = false;
                RemoteAnalytics.socket.emit('socket:disconnect', {
                    device: RemoteAnalytics.socketClientId
                });
            });
        }
    },
    /**
     * Merge objects
     *
     * @param obj1
     * @param obj2
     * @returns {{}}
     */
    mergeObjects: function (obj1, obj2) {
        var obj = {};

        for (var o1 in obj1) {
            if(obj1.hasOwnProperty(o1)) {
                obj[o1] = obj1[o1];
            }
        }

        for (var o2 in obj2) {
            if(obj2.hasOwnProperty(o2)) {
                obj[o2] = obj2[o2];
            }
        }

        return obj;
    },
    /**
     * Returns formatted date
     *
     * @returns {string}
     */
    getDate: function() {
        var date = new Date();
        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    },
    /**
     * Ping socket server
     */
    ping: function() {
        if(this.socket !== null) {
            this.socket.emit('socket:ping', {
                device: this.config.deviceId,
                socket: this.socketClientId
            });
        }
    },
    /**
     * Send API request
     * 
     * @param conf
     * @returns void
     */
    apiRequest: function (conf) {
        if(this.connected) {
            var request = new XMLHttpRequest;

            // Handle response
            request.onreadystatechange = function () {
                if (4 === request.readyState) {
                    var res = JSON.parse(request.responseText);
                    var data = {};
                    switch (request.status) {
                        case 200: {
                            data = RemoteAnalytics.mergeObjects(data, res);
                            break;
                        }
                        default: {
                            data.error = res.error;
                            break;
                        }
                    }
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
                    if (conf.headers.hasOwnProperty(h)) {
                        var header = conf.headers[h];
                        request.setRequestHeader(h, header);
                    }
                }
            }

            // Send request
            request.send(JSON.stringify(conf.data));
        }
        else {
            conf.callback({
                error: 'No connection available'
            });
        }
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
     *
     * @param callback
     * @param data
     */
    login: function (callback, data) {
        if (data === undefined) {
            data = {};
        }
        this.apiRequest({
            url: this.config.apiUrl + '/login',
            method: 'POST',
            data: this.mergeObjects({
                username: this.config.deviceName,
                password: this.config.authKey
            }, data),
            headers: {
                'Content-Type': 'application/json'
            },
            callback: function (response) {
                if (response.profile !== undefined) {
                    RemoteAnalytics.token = response.profile.api_key;
                    RemoteAnalytics.config.deviceId = response.profile.id;
                    RemoteAnalytics.config.ip = response.ip;

                    if(RemoteAnalytics.sessions.length > 0) {
                        for(var s in RemoteAnalytics.sessions) {
                            if(RemoteAnalytics.sessions.hasOwnProperty(s)) {
                                RemoteAnalytics.sessions[s].ip = RemoteAnalytics.config.ip;
                            }
                        }
                    }
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
    logAction: function (data) {
        if (this.sessions.length < 1) {
            this.submissionStart();
        }
        var action = this.mergeObjects(data, {
            time: this.getDate()
        });
        return this.sessions[this.sessions.length - 1].actions.push(action);
    },
    /**
     * Start submission session
     */
    submissionStart: function () {
        var session = {
            'story': this.config.projectId,
            'start_time': this.getDate(),
            'end_time': 0,
            'ip': this.config.ip,
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
        if(callbackNoSessions === undefined) {
            callbackNoSessions = function() {};
        }

        if(callbackAfterPost === undefined) {
            callbackAfterPost = function() {};
        }

        if (this.sessions.length < 1) {
            this.sessions = [];
            callbackNoSessions();
            return;
        }

        this.sessions[this.sessions.length - 1].end_time = this.getDate();
        this.apiRequest({
            url: this.config.apiUrl + '/devices/' + this.config.deviceId,
            method: 'POST',
            data: {
                sessions: this.sessions
            },
            headers: {
                'X-AUTH-TOKEN': this.token,
                'Content-Type': 'application/json'
            },
            callback: function (response) {
                if (response.error) {
                    console.log(response.error);
                    RemoteAnalytics.submissionStart();
                }
                else {
                    RemoteAnalytics.sessions = [];
                }
                callbackAfterPost();
            }
        });
    }
};

if (module !== undefined) {
    module.exports = RemoteAnalytics;
}
