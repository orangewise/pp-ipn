var https = require('https');
var _ = require('underscore');

var ppIpn = {};

ppIpn.SANDBOX_URL = 'ipnpb.sandbox.paypal.com';
ppIpn.REGULAR_URL = 'ipnpb.paypal.com';


ppIpn.parseQuery = function (qstr) {
  var query = {};
  var a = qstr.substr(1).split('&');
  for (var i = 0; i < a.length; i++) {
      var b = a[i].split('=');
      query[b[0]] = b[1] || '';
  }
  return query;
};

// Build a querystring from the params object.
ppIpn.stringify = function (params) {
  var str = '';
  var pairs = _.pairs(params);
  _.each(pairs, function eachPair (pair) {
    if (pair[1].indexOf('%') > -1) // skip
    {
      str = str + '&' + pair[0] + '=' + pair[1];
    } else {
      str = str + '&' + pair[0] + '=' + encodeURIComponent(unescape(pair[1]));
    }
  }); 
  return str;
};

ppIpn.verify = function verify (params, settings, callback) {
  //Settings are optional, use default settings if not set
  if (typeof callback === 'undefined' && typeof settings === 'function') {
    callback = settings;
    settings = {
      'allow_sandbox': false
    };
  }

  if (typeof params === 'undefined') {
    process.nextTick(function () {
      callback(new Error('No params were passed to ipn.verify'));
    });
    return;
  }

  params.cmd = '_notify-validate';
  var body = ppIpn.stringify(params);

  //Set up the request to paypal
  var req_options = {
    host: (params.test_ipn) ? ppIpn.SANDBOX_URL : ppIpn.REGULAR_URL,
    method: 'POST',
    path: '/cgi-bin/webscr',
    headers: {'Content-Length': body.length}
  };

  if (params.test_ipn && !settings.allow_sandbox) {
    process.nextTick(function () {
      callback(new Error('Received request with test_ipn parameter while sandbox is disabled'));
    });
    return;
  }

  var req = https.request(req_options, function paypal_request(res) {
    var data = [];

    res.on('data', function paypal_response(d) {
      data.push(d);
    });

    res.on('end', function response_end() {
      var response = data.join('');

      //Check if IPN is valid
      if (response === 'VERIFIED') {
        callback(null, response);
      } else {
        callback(new Error('IPN Verification status: ' + response));
      }
    });
  });

  //Add the post parameters to the request body
  req.write(body);

  //Request error
  req.on('error', callback);

  req.end();
};

module.exports = ppIpn;
