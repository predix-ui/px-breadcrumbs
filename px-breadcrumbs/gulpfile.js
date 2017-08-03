'use strict';

var path = require('path');
var gulp = require('gulp');
var pkg = require('./package.json');
var $ = require('gulp-load-plugins')();
var gulpSequence = require('gulp-sequence');
var importOnce = require('node-sass-import-once');
var stylemod = require('gulp-style-modules');
var browserSync = require('browser-sync').create();
var gulpif = require('gulp-if');
var combiner = require('stream-combiner2');
var bump = require('gulp-bump');
var argv = require('yargs').argv;
/* Used to transpile JavaScript */
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var cache = require('gulp-cached');

var sassOptions = {
  importer: importOnce,
  importOnce: {
    index: true,
    bower: true
  }
};

gulp.task('clean', function () {
  return gulp.src(['.tmp', 'css'], {
    read: false
  }).pipe($.clean());
});

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

function buildCSS() {
  return combiner.obj([$.sass(sassOptions), $.autoprefixer({
    browsers: ['last 2 versions'],
    cascade: false,
    flexbox: false
  }), gulpif(!argv.debug, $.cssmin())]).on('error', handleError);
}

gulp.task('sass', function () {
  return gulp.src(['./sass/*.scss']).pipe(cache('sassing')).pipe(buildCSS()).pipe(stylemod({
    moduleId: function moduleId(file) {
      return path.basename(file.path, path.extname(file.path)) + '-styles';
    }
  })).pipe(gulp.dest('css')).pipe(browserSync.stream({ match: 'css/*.html' }));
});

// Globbing pattern to find ES6 source files that need to be transpiled
var ES6_SRC = './*.es6.js';
// Output directory for transpiled files
var ES5_DEST = './dist';

gulp.task('transpile', function () {
  return gulp.src(ES6_SRC).pipe(cache('transpiling')).pipe(sourcemaps.init()).pipe(babel()).on('error', function (err) {
    console.error(err);
    this.emit('end');
  }).pipe(rename(function (path) {
    path.basename = path.basename.replace('.es6', '');
    console.log('Transpiling ' + path.basename + '.es6.js -> dist/' + path.basename + '.js');
  })).pipe(sourcemaps.write('.')).pipe(gulp.dest(ES5_DEST));
});

gulp.task('watch', function () {
  gulp.watch(ES6_SRC, ['transpile']);
  gulp.watch(['sass/*.scss'], ['sass']);
});

gulp.task('serve', function () {
  browserSync.init({
    port: 8080,
    notify: false,
    reloadOnRestart: true,
    logPrefix: '' + pkg.name,
    https: false,
    server: ['./', 'bower_components']
  });

  gulp.watch(ES6_SRC, ['transpile']);
  gulp.watch(['sass/*.scss'], ['sass']);
  gulp.watch(['css/*-styles.html', '*.html', ES5_DEST + '/*.js', 'demo/*.html']).on('change', browserSync.reload);
});

gulp.task('bump:patch', function () {
  gulp.src(['./bower.json', './package.json']).pipe(bump({ type: 'patch' })).pipe(gulp.dest('./'));
});

gulp.task('bump:minor', function () {
  gulp.src(['./bower.json', './package.json']).pipe(bump({ type: 'minor' })).pipe(gulp.dest('./'));
});

gulp.task('bump:major', function () {
  gulp.src(['./bower.json', './package.json']).pipe(bump({ type: 'major' })).pipe(gulp.dest('./'));
});

gulp.task('default', function (callback) {
  gulpSequence('clean', 'sass', 'transpile')(callback);
});