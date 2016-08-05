function RemoteAnalytics(config) {
    // Configuration
    this.config = $.extend({
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
    }, config);

    // Variables
    this.sessions = [];

    // Init
    this.submissionStart();
}
!function () {
    'use strict';
}(),
    RemoteAnalytics.prototype.logAction = function (name, value, extra) {
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
    RemoteAnalytics.prototype.submissionStart = function () {
        var session = {
            'device': this.config.deviceId,
            'story': this.config.projectId,
            'start_time': Math.round(Date.now() / 1000),
            'end_time': 0,
            'actions': []
        };
        this.sessions.push(session);
    },
    RemoteAnalytics.prototype.submissionEnd = function (callbackNoSessions, callbackAfterPost) {
        if (this.sessions.length < 1) {
            this.sessions = [];
            callbackNoSessions();
            return;
        }

        this.sessions[this.sessions.length - 1].end_time = Math.round(Date.now() / 1000);

        $.ajax({
            url: this.apiUrl,
            method: 'POST',
            data: {
                sessions: this.sessions
            },
            headers: {
                'Authorization': this.config.authKey + ':' + this.config.projectId,
                'Content-Type': 'x-www-form-urlencoded'
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
;