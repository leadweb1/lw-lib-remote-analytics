/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename');

gulp.task('scripts', function() {
    return gulp.src('lib-remote-analytics.js')
        .pipe(rename('lib-remote-analytics.min.js'))
        .pipe(uglify({
            preserveComments: 'some',
            outSourceMap: true
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('default', ['scripts']);
