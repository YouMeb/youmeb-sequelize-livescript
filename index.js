'use strict';

var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');

// 設定:
//   
//   db            db 名稱
//   username      user 名稱
//   passsword     user 密碼
//   options       其他選項, 請參考 http://sequelizejs.com/documentation
//
// 愈設會把 this 註冊成 sequelize
module.exports = function ($youmeb, $injector, $config, $generator, $prompt) {

  $youmeb.on('help', function (command, data, done) {
    data.commands.push(['sequelize:generate:model', '', 'Generates a model']);
    done();
  });

  this.on('init', function (config, done) {
    if ($youmeb.isCli) {
      return done();
    }

    var sequelize = new Sequelize(config.db || 'youmeb-app', config.username || 'root', config.password || '123', config.options || {});

    sequelize.Sequelize = Sequelize;

    // 重新註冊 sequelize
    $injector.register('sequelize', sequelize);

    // init
    var importDir = function (dir, importDone) {
      fs.readdir(dir, function (err, files) {
        if (err) {
          return importDone(err);
        }
        var i = 0;
        var isJs = /\.js/;
        (function next() {
          var file = files[i++];
          if (!file) {
            return importDone(null);
          }
          if (file === 'index.js' || !isJs.test(file)) {
            return next();
          }
          file = path.join(dir, file);
          fs.stat(file, function (err, stats) {
            if (err) {
              return importDone(err);
            }
            if (stats.isFile()) {
              sequelize.import(file);
              next();
            } else {
              importDir(file, function (err) {
                if (err) {
                  return importDone(err);
                }
                next();
              });
            }
          });
        })();
      });
    };

    // sequelize.import 目錄下所有檔案
    // 最後執行 index.js，讓使用者設定關聯
    importDir(path.join($youmeb.root, config.get('modelsDir') || 'models'), function (err) {
      if (err) {
        return done(err);
      }
      var index;

      try {
        index = require(dir);
      } catch (e) {
        return done(e);
      }

      if (typeof index === 'function') {
        index(sequelize);
      }

      done(null);
    });
  });

  $youmeb.on('cli-sequelize:generate:model', function (parser, args, done) {
    $prompt.get([
      {
        name: 'name',
        type: 'string',
        required: true
      }
    ], function (err, result) {
      if (err) {
        return done(err);
      }

      var generate = $generator.create(path.join(__dirname, 'templates'), path.join($youmeb.root, $config.get('sequelize.modelsDir') || 'models'));

      generate.on('create', function (file) {
        console.log();
        console.log('  create '.yellow + file);
        console.log();
      });

      generate.createFile('./model.js', './' + result.name + '.js', {
        name: result.name
      }, done);
    });
  });
};
