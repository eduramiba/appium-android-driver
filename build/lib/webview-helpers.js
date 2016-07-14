'use strict';

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _regeneratorRuntime = require('babel-runtime/regenerator')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _asyncbox = require('asyncbox');

var NATIVE_WIN = "NATIVE_APP";
var WEBVIEW_WIN = "WEBVIEW";
var WEBVIEW_BASE = WEBVIEW_WIN + '_';
var CHROMIUM_WIN = "CHROMIUM";
var XWALK_PREFIX = "XWALK:";

var helpers = {};

// This function gets a list of android system processes and returns ones
// that look like webviews, with the appropriate webview prefix and their PID.
// If we pass in a deviceSocket, we only attempt to find webviews which match
// that socket name (this is for apps which embed Chromium, which isn't the
// same as chrome-backed webviews)
// TODO: some of this function belongs in appium-adb
function webviewsFromProcs(adb, deviceSocket) {
  var webviews, out, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, line, match, webviewPid;

  return _regeneratorRuntime.async(function webviewsFromProcs$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        webviews = [];
        context$1$0.next = 3;
        return _regeneratorRuntime.awrap(adb.shell(["cat", "/proc/net/unix"]));

      case 3:
        out = context$1$0.sent;
        _iteratorNormalCompletion = true;
        _didIteratorError = false;
        _iteratorError = undefined;
        context$1$0.prev = 7;

        for (_iterator = _getIterator(out.split("\n")); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          line = _step.value;

          line = line.trim();

          match = line.match(/@?webview_devtools_remote_(\d+)/);
          webviewPid = null;

          if (match) {
            webviewPid = match[1];
          } else {
            match = line.match(/@?([a-z._]+)_devtools_remote/);
            if (match) {
              webviewPid = XWALK_PREFIX + match[1];
            }
          }

          if (webviewPid) {
            _logger2['default'].debug('line \'' + line + '\' mapped to webviewPid \'' + webviewPid + '\'');
          }

          if (deviceSocket) {
            if (line.indexOf('@' + deviceSocket) === line.length - deviceSocket.length - 1) {
              if (webviewPid) {
                webviews.push(WEBVIEW_BASE + webviewPid);
              } else {
                webviews.push(CHROMIUM_WIN);
              }
            }
          } else if (webviewPid) {
            // for multiple webviews a list of 'WEBVIEW_<index>' will be returned
            // where <index> is zero based (same is in selendroid)
            webviews.push(WEBVIEW_BASE + webviewPid);
          }
        }
        context$1$0.next = 15;
        break;

      case 11:
        context$1$0.prev = 11;
        context$1$0.t0 = context$1$0['catch'](7);
        _didIteratorError = true;
        _iteratorError = context$1$0.t0;

      case 15:
        context$1$0.prev = 15;
        context$1$0.prev = 16;

        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }

      case 18:
        context$1$0.prev = 18;

        if (!_didIteratorError) {
          context$1$0.next = 21;
          break;
        }

        throw _iteratorError;

      case 21:
        return context$1$0.finish(18);

      case 22:
        return context$1$0.finish(15);

      case 23:
        return context$1$0.abrupt('return', _lodash2['default'].uniq(webviews));

      case 24:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this, [[7, 11, 15, 23], [16,, 18, 22]]);
}

// Take a webview name like WEBVIEW_4296 and use 'adb shell ps' to figure out
// which app package is associated with that webview. One of the reasons we
// want to do this is to make sure we're listing webviews for the actual AUT,
// not some other running app
// TODO: this should be called procFromPid and exist in appium-adb
function procFromWebview(adb, webview) {
  var pid, out, pkg, lines, header, pidColumn, pkgColumn, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, line;

  return _regeneratorRuntime.async(function procFromWebview$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        if (!webview.startsWith(WEBVIEW_BASE + XWALK_PREFIX)) {
          context$1$0.next = 2;
          break;
        }

        return context$1$0.abrupt('return', webview.split(WEBVIEW_BASE + XWALK_PREFIX)[1]);

      case 2:
        pid = webview.match(/\d+$/);

        if (pid) {
          context$1$0.next = 5;
          break;
        }

        throw new Error('Could not find PID for webview ' + webview);

      case 5:
        pid = pid[0];
        _logger2['default'].debug(webview + ' mapped to pid ' + pid);
        _logger2['default'].debug("Getting process name for webview");
        context$1$0.next = 10;
        return _regeneratorRuntime.awrap(adb.shell("ps"));

      case 10:
        out = context$1$0.sent;
        pkg = "unknown";
        lines = out.split(/\r?\n/);
        header = lines[0].trim().split(/\s+/);
        pidColumn = header.indexOf("PID");
        pkgColumn = header.indexOf("NAME") + 1;
        _iteratorNormalCompletion2 = true;
        _didIteratorError2 = false;
        _iteratorError2 = undefined;
        context$1$0.prev = 19;
        _iterator2 = _getIterator(lines);

      case 21:
        if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
          context$1$0.next = 32;
          break;
        }

        line = _step2.value;

        line = line.trim().split(/\s+/);

        if (!(line[pidColumn].indexOf(pid) !== -1)) {
          context$1$0.next = 29;
          break;
        }

        // Android 6.0 support (occasionally returns undefined - Appium issue #5689)
        pkg = _lodash2['default'].isUndefined(line[pkgColumn]) ? line[pkgColumn - 1] : line[pkgColumn];
        _logger2['default'].debug('Parsed pid: ' + line[pidColumn] + ' pkg: ' + pkg + '!');
        _logger2['default'].debug('from: ' + line);
        return context$1$0.abrupt('break', 32);

      case 29:
        _iteratorNormalCompletion2 = true;
        context$1$0.next = 21;
        break;

      case 32:
        context$1$0.next = 38;
        break;

      case 34:
        context$1$0.prev = 34;
        context$1$0.t0 = context$1$0['catch'](19);
        _didIteratorError2 = true;
        _iteratorError2 = context$1$0.t0;

      case 38:
        context$1$0.prev = 38;
        context$1$0.prev = 39;

        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
          _iterator2['return']();
        }

      case 41:
        context$1$0.prev = 41;

        if (!_didIteratorError2) {
          context$1$0.next = 44;
          break;
        }

        throw _iteratorError2;

      case 44:
        return context$1$0.finish(41);

      case 45:
        return context$1$0.finish(38);

      case 46:
        _logger2['default'].debug('returning process name: ' + pkg);
        return context$1$0.abrupt('return', pkg);

      case 48:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this, [[19, 34, 38, 46], [39,, 41, 45]]);
}

// Get a list of available webviews by introspecting processes with adb, where
// webviews are listed. It's possible to pass in a 'deviceSocket' arg, which
// limits the webview possibilities to the one running on the Chromium devtools
// socket we're interested in (see note on webviewsFromProcs)
helpers.getWebviews = function callee$0$0(adb, deviceSocket) {
  var webviews;
  return _regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        _logger2['default'].debug("Getting a list of available webviews");
        context$1$0.next = 3;
        return _regeneratorRuntime.awrap(webviewsFromProcs(adb, deviceSocket));

      case 3:
        webviews = context$1$0.sent;

        if (!deviceSocket) {
          context$1$0.next = 6;
          break;
        }

        return context$1$0.abrupt('return', webviews);

      case 6:
        context$1$0.next = 8;
        return _regeneratorRuntime.awrap((0, _asyncbox.asyncmap)(webviews, function callee$1$0(webviewName) {
          var pkg;
          return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return _regeneratorRuntime.awrap(procFromWebview(adb, webviewName));

              case 2:
                pkg = context$2$0.sent;
                return context$2$0.abrupt('return', WEBVIEW_BASE + pkg);

              case 4:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        }));

      case 8:
        webviews = context$1$0.sent;

        _logger2['default'].debug('Device Socket: ' + deviceSocket);
        _logger2['default'].debug('Found webviews: ' + JSON.stringify(webviews));
        return context$1$0.abrupt('return', webviews);

      case 12:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
};

helpers.decorateChromeOptions = function (caps, opts, deviceId) {
  // add options from appium session caps
  if (opts.chromeOptions) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = _getIterator(_lodash2['default'].pairs(opts.chromeOptions)), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var _step3$value = _slicedToArray(_step3.value, 2);

        var opt = _step3$value[0];
        var val = _step3$value[1];

        if (_lodash2['default'].isUndefined(caps.chromeOptions[opt])) {
          caps.chromeOptions[opt] = val;
        } else {
          _logger2['default'].warn('Cannot pass option ' + caps.chromeOptions[opt] + ' because ' + "Appium needs it to make chromeDriver work");
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3['return']) {
          _iterator3['return']();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }
  }

  // add device id from adb
  caps.chromeOptions.androidDeviceSerial = deviceId;
  return caps;
};

exports['default'] = helpers;
exports.helpers = helpers;
exports.NATIVE_WIN = NATIVE_WIN;
exports.WEBVIEW_WIN = WEBVIEW_WIN;
exports.WEBVIEW_BASE = WEBVIEW_BASE;
exports.CHROMIUM_WIN = CHROMIUM_WIN;

// webview_devtools_remote_4296 => 4296

/* Output of ps is like:
 USER     PID   PPID  VSIZE  RSS     WCHAN    PC         NAME
 u0_a136   6248  179   946000 48144 ffffffff 4005903e R com.example.test
*/

// the column order may not be identical on all androids
// dynamically locate the pid and name column.
//# sourceMappingURL=data:application/json;base64,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QUNsRCxTQUFPLElBQUksQ0FBQztDQUNiLENBQUM7O3FCQUVhLE9BQU87UUFDYixPQUFPLEdBQVAsT0FBTztRQUFFLFVBQVUsR0FBVixVQUFVO1FBQUUsV0FBVyxHQUFYLFdBQVc7UUFBRSxZQUFZLEdBQVosWUFBWTtRQUFFLFlBQVksR0FBWixZQUFZIiwiZmlsZSI6ImxpYi93ZWJ2aWV3LWhlbHBlcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBhc3luY21hcCB9IGZyb20gJ2FzeW5jYm94JztcblxuY29uc3QgTkFUSVZFX1dJTiA9IFwiTkFUSVZFX0FQUFwiO1xuY29uc3QgV0VCVklFV19XSU4gPSBcIldFQlZJRVdcIjtcbmNvbnN0IFdFQlZJRVdfQkFTRSA9IGAke1dFQlZJRVdfV0lOfV9gO1xuY29uc3QgQ0hST01JVU1fV0lOID0gXCJDSFJPTUlVTVwiO1xuY29uc3QgWFdBTEtfUFJFRklYID0gXCJYV0FMSzpcIjtcblxubGV0IGhlbHBlcnMgPSB7fTtcblxuLy8gVGhpcyBmdW5jdGlvbiBnZXRzIGEgbGlzdCBvZiBhbmRyb2lkIHN5c3RlbSBwcm9jZXNzZXMgYW5kIHJldHVybnMgb25lc1xuLy8gdGhhdCBsb29rIGxpa2Ugd2Vidmlld3MsIHdpdGggdGhlIGFwcHJvcHJpYXRlIHdlYnZpZXcgcHJlZml4IGFuZCB0aGVpciBQSUQuXG4vLyBJZiB3ZSBwYXNzIGluIGEgZGV2aWNlU29ja2V0LCB3ZSBvbmx5IGF0dGVtcHQgdG8gZmluZCB3ZWJ2aWV3cyB3aGljaCBtYXRjaFxuLy8gdGhhdCBzb2NrZXQgbmFtZSAodGhpcyBpcyBmb3IgYXBwcyB3aGljaCBlbWJlZCBDaHJvbWl1bSwgd2hpY2ggaXNuJ3QgdGhlXG4vLyBzYW1lIGFzIGNocm9tZS1iYWNrZWQgd2Vidmlld3MpXG4vLyBUT0RPOiBzb21lIG9mIHRoaXMgZnVuY3Rpb24gYmVsb25ncyBpbiBhcHBpdW0tYWRiXG5hc3luYyBmdW5jdGlvbiB3ZWJ2aWV3c0Zyb21Qcm9jcyAoYWRiLCBkZXZpY2VTb2NrZXQpIHtcbiAgbGV0IHdlYnZpZXdzID0gW107XG4gIGxldCBvdXQgPSBhd2FpdCBhZGIuc2hlbGwoW1wiY2F0XCIsIFwiL3Byb2MvbmV0L3VuaXhcIl0pO1xuICBmb3IgKGxldCBsaW5lIG9mIG91dC5zcGxpdChcIlxcblwiKSkge1xuICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcblxuXG5cbiAgICBsZXQgbWF0Y2ggPSBsaW5lLm1hdGNoKC9AP3dlYnZpZXdfZGV2dG9vbHNfcmVtb3RlXyhcXGQrKS8pO1xuICAgIGxldCB3ZWJ2aWV3UGlkID0gbnVsbDtcbiAgICBpZihtYXRjaCl7XG4gICAgICB3ZWJ2aWV3UGlkID0gbWF0Y2hbMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hdGNoID0gbGluZS5tYXRjaCgvQD8oW2Etei5fXSspX2RldnRvb2xzX3JlbW90ZS8pO1xuICAgICAgaWYobWF0Y2gpe1xuICAgICAgICB3ZWJ2aWV3UGlkID0gWFdBTEtfUFJFRklYICsgbWF0Y2hbMV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYod2Vidmlld1BpZCl7XG4gICAgICBsb2dnZXIuZGVidWcoYGxpbmUgJyR7bGluZX0nIG1hcHBlZCB0byB3ZWJ2aWV3UGlkICcke3dlYnZpZXdQaWR9J2ApO1xuICAgIH1cblxuICAgIGlmIChkZXZpY2VTb2NrZXQpIHtcbiAgICAgIGlmIChsaW5lLmluZGV4T2YoYEAke2RldmljZVNvY2tldH1gKSA9PT0gbGluZS5sZW5ndGggLSBkZXZpY2VTb2NrZXQubGVuZ3RoIC0gMSkge1xuICAgICAgICBpZiAod2Vidmlld1BpZCkge1xuICAgICAgICAgIHdlYnZpZXdzLnB1c2goV0VCVklFV19CQVNFICsgd2Vidmlld1BpZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2Vidmlld3MucHVzaChDSFJPTUlVTV9XSU4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh3ZWJ2aWV3UGlkKSB7XG4gICAgICAvLyBmb3IgbXVsdGlwbGUgd2Vidmlld3MgYSBsaXN0IG9mICdXRUJWSUVXXzxpbmRleD4nIHdpbGwgYmUgcmV0dXJuZWRcbiAgICAgIC8vIHdoZXJlIDxpbmRleD4gaXMgemVybyBiYXNlZCAoc2FtZSBpcyBpbiBzZWxlbmRyb2lkKVxuICAgICAgd2Vidmlld3MucHVzaChXRUJWSUVXX0JBU0UgKyB3ZWJ2aWV3UGlkKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIF8udW5pcSh3ZWJ2aWV3cyk7XG59XG5cbi8vIFRha2UgYSB3ZWJ2aWV3IG5hbWUgbGlrZSBXRUJWSUVXXzQyOTYgYW5kIHVzZSAnYWRiIHNoZWxsIHBzJyB0byBmaWd1cmUgb3V0XG4vLyB3aGljaCBhcHAgcGFja2FnZSBpcyBhc3NvY2lhdGVkIHdpdGggdGhhdCB3ZWJ2aWV3LiBPbmUgb2YgdGhlIHJlYXNvbnMgd2Vcbi8vIHdhbnQgdG8gZG8gdGhpcyBpcyB0byBtYWtlIHN1cmUgd2UncmUgbGlzdGluZyB3ZWJ2aWV3cyBmb3IgdGhlIGFjdHVhbCBBVVQsXG4vLyBub3Qgc29tZSBvdGhlciBydW5uaW5nIGFwcFxuLy8gVE9ETzogdGhpcyBzaG91bGQgYmUgY2FsbGVkIHByb2NGcm9tUGlkIGFuZCBleGlzdCBpbiBhcHBpdW0tYWRiXG5hc3luYyBmdW5jdGlvbiBwcm9jRnJvbVdlYnZpZXcgKGFkYiwgd2Vidmlldykge1xuICBpZih3ZWJ2aWV3LnN0YXJ0c1dpdGgoV0VCVklFV19CQVNFICsgWFdBTEtfUFJFRklYKSl7XG4gICAgcmV0dXJuIHdlYnZpZXcuc3BsaXQoV0VCVklFV19CQVNFICsgWFdBTEtfUFJFRklYKVsxXTtcbiAgfVxuXG4gIC8vIHdlYnZpZXdfZGV2dG9vbHNfcmVtb3RlXzQyOTYgPT4gNDI5NlxuICBsZXQgcGlkID0gd2Vidmlldy5tYXRjaCgvXFxkKyQvKTtcbiAgaWYgKCFwaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIFBJRCBmb3Igd2VidmlldyAke3dlYnZpZXd9YCk7XG4gIH1cbiAgcGlkID0gcGlkWzBdO1xuICBsb2dnZXIuZGVidWcoYCR7d2Vidmlld30gbWFwcGVkIHRvIHBpZCAke3BpZH1gKTtcbiAgbG9nZ2VyLmRlYnVnKFwiR2V0dGluZyBwcm9jZXNzIG5hbWUgZm9yIHdlYnZpZXdcIik7XG4gIGxldCBvdXQgPSBhd2FpdCBhZGIuc2hlbGwoXCJwc1wiKTtcbiAgbGV0IHBrZyA9IFwidW5rbm93blwiO1xuICBsZXQgbGluZXMgPSBvdXQuc3BsaXQoL1xccj9cXG4vKTtcbiAgLyogT3V0cHV0IG9mIHBzIGlzIGxpa2U6XG4gICBVU0VSICAgICBQSUQgICBQUElEICBWU0laRSAgUlNTICAgICBXQ0hBTiAgICBQQyAgICAgICAgIE5BTUVcbiAgIHUwX2ExMzYgICA2MjQ4ICAxNzkgICA5NDYwMDAgNDgxNDQgZmZmZmZmZmYgNDAwNTkwM2UgUiBjb20uZXhhbXBsZS50ZXN0XG4gICovXG4gIGxldCBoZWFkZXIgPSBsaW5lc1swXS50cmltKCkuc3BsaXQoL1xccysvKTtcbiAgLy8gdGhlIGNvbHVtbiBvcmRlciBtYXkgbm90IGJlIGlkZW50aWNhbCBvbiBhbGwgYW5kcm9pZHNcbiAgLy8gZHluYW1pY2FsbHkgbG9jYXRlIHRoZSBwaWQgYW5kIG5hbWUgY29sdW1uLlxuICBsZXQgcGlkQ29sdW1uID0gaGVhZGVyLmluZGV4T2YoXCJQSURcIik7XG4gIGxldCBwa2dDb2x1bW4gPSBoZWFkZXIuaW5kZXhPZihcIk5BTUVcIikgKyAxO1xuXG4gIGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBsaW5lID0gbGluZS50cmltKCkuc3BsaXQoL1xccysvKTtcbiAgICBpZiAobGluZVtwaWRDb2x1bW5dLmluZGV4T2YocGlkKSAhPT0gLTEpIHtcbiAgICAgIC8vIEFuZHJvaWQgNi4wIHN1cHBvcnQgKG9jY2FzaW9uYWxseSByZXR1cm5zIHVuZGVmaW5lZCAtIEFwcGl1bSBpc3N1ZSAjNTY4OSlcbiAgICAgIHBrZyA9IF8uaXNVbmRlZmluZWQobGluZVtwa2dDb2x1bW5dKSA/IGxpbmVbcGtnQ29sdW1uLTFdIDogbGluZVtwa2dDb2x1bW5dO1xuICAgICAgbG9nZ2VyLmRlYnVnKGBQYXJzZWQgcGlkOiAke2xpbmVbcGlkQ29sdW1uXX0gcGtnOiAke3BrZ30hYCk7XG4gICAgICBsb2dnZXIuZGVidWcoYGZyb206ICR7bGluZX1gKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBsb2dnZXIuZGVidWcoYHJldHVybmluZyBwcm9jZXNzIG5hbWU6ICR7cGtnfWApO1xuICByZXR1cm4gcGtnO1xufVxuXG4vLyBHZXQgYSBsaXN0IG9mIGF2YWlsYWJsZSB3ZWJ2aWV3cyBieSBpbnRyb3NwZWN0aW5nIHByb2Nlc3NlcyB3aXRoIGFkYiwgd2hlcmVcbi8vIHdlYnZpZXdzIGFyZSBsaXN0ZWQuIEl0J3MgcG9zc2libGUgdG8gcGFzcyBpbiBhICdkZXZpY2VTb2NrZXQnIGFyZywgd2hpY2hcbi8vIGxpbWl0cyB0aGUgd2VidmlldyBwb3NzaWJpbGl0aWVzIHRvIHRoZSBvbmUgcnVubmluZyBvbiB0aGUgQ2hyb21pdW0gZGV2dG9vbHNcbi8vIHNvY2tldCB3ZSdyZSBpbnRlcmVzdGVkIGluIChzZWUgbm90ZSBvbiB3ZWJ2aWV3c0Zyb21Qcm9jcylcbmhlbHBlcnMuZ2V0V2Vidmlld3MgPSBhc3luYyBmdW5jdGlvbiAoYWRiLCBkZXZpY2VTb2NrZXQpIHtcbiAgbG9nZ2VyLmRlYnVnKFwiR2V0dGluZyBhIGxpc3Qgb2YgYXZhaWxhYmxlIHdlYnZpZXdzXCIpO1xuICBsZXQgd2Vidmlld3MgPSBhd2FpdCB3ZWJ2aWV3c0Zyb21Qcm9jcyhhZGIsIGRldmljZVNvY2tldCk7XG5cbiAgaWYgKGRldmljZVNvY2tldCkge1xuICAgIHJldHVybiB3ZWJ2aWV3cztcbiAgfVxuXG4gIHdlYnZpZXdzID0gYXdhaXQgYXN5bmNtYXAod2Vidmlld3MsIGFzeW5jICh3ZWJ2aWV3TmFtZSkgPT4ge1xuICAgIGxldCBwa2cgPSBhd2FpdCBwcm9jRnJvbVdlYnZpZXcoYWRiLCB3ZWJ2aWV3TmFtZSk7XG4gICAgcmV0dXJuIFdFQlZJRVdfQkFTRSArIHBrZztcbiAgfSk7XG5cbiAgbG9nZ2VyLmRlYnVnKGBEZXZpY2UgU29ja2V0OiAke2RldmljZVNvY2tldH1gKTtcbiAgbG9nZ2VyLmRlYnVnKGBGb3VuZCB3ZWJ2aWV3czogJHtKU09OLnN0cmluZ2lmeSh3ZWJ2aWV3cyl9YCk7XG4gIHJldHVybiB3ZWJ2aWV3cztcbn07XG5cbmhlbHBlcnMuZGVjb3JhdGVDaHJvbWVPcHRpb25zID0gZnVuY3Rpb24gKGNhcHMsIG9wdHMsIGRldmljZUlkKSB7XG4gIC8vIGFkZCBvcHRpb25zIGZyb20gYXBwaXVtIHNlc3Npb24gY2Fwc1xuICBpZiAob3B0cy5jaHJvbWVPcHRpb25zKSB7XG4gICAgZm9yIChsZXQgW29wdCwgdmFsXSBvZiBfLnBhaXJzKG9wdHMuY2hyb21lT3B0aW9ucykpIHtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGNhcHMuY2hyb21lT3B0aW9uc1tvcHRdKSkge1xuICAgICAgICBjYXBzLmNocm9tZU9wdGlvbnNbb3B0XSA9IHZhbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBDYW5ub3QgcGFzcyBvcHRpb24gJHtjYXBzLmNocm9tZU9wdGlvbnNbb3B0XX0gYmVjYXVzZSBgICtcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBpdW0gbmVlZHMgaXQgdG8gbWFrZSBjaHJvbWVEcml2ZXIgd29ya1wiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhZGQgZGV2aWNlIGlkIGZyb20gYWRiXG4gIGNhcHMuY2hyb21lT3B0aW9ucy5hbmRyb2lkRGV2aWNlU2VyaWFsID0gZGV2aWNlSWQ7XG4gIHJldHVybiBjYXBzO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgaGVscGVycztcbmV4cG9ydCB7IGhlbHBlcnMsIE5BVElWRV9XSU4sIFdFQlZJRVdfV0lOLCBXRUJWSUVXX0JBU0UsIENIUk9NSVVNX1dJTiB9O1xuIl19