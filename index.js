/*
 * Sample application for blog post showing how to list the first 1,000
 * headlines from the SBS World News Australia page on Facebook.
 *
 * Andrew E Scott
 * 28 July 2015
 */
var FB = require('fb');
var async = require('async');
var URL = require('url');

// Initialise the FB module
acquireFacebookToken(function (err) {
  if (err) {
    console.error('Failed authorisation to Facebook: %s', err.message);
  } else {
    console.log('Acquired Facebook access token');
    // Now let's do something interesting with Facebook
    processFacebookFeed('SBSWorldNewsAustralia/feed', function (err, results) {
      if (err) {
        console.error('Failed to retrieve Facebook feed: %s', err.message);
      } else {
        // Print out the results
        results.forEach(function (i) {
          var headline = i.message || i.name;
          // If it's an embedded video, possible there's no headline
          if (headline) {
            console.log(headline);
          }
        }); // results.forEach
      }
    }); // processFacebookFeed
  }
}); // acquireFacebookToken

// Acquire a new access token and callback to f when done (passing any error)
function acquireFacebookToken(f) {
  FB.napi('oauth/access_token', {
    client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET,
    grant_type: 'client_credentials'
  }, function (err, result) {
    if (!err) {
      // Store the access token for later queries to use
      FB.setAccessToken(result.access_token);
    }
    if (f) f(err);
  }); // FB.napi('oauth/access_token'
}

// Process the Facebook feed and callback to f when done (passing any error)
function processFacebookFeed(feed, f) {
  var params, totalResults, done;

  totalResults = []; // progressively store results here
  params = { // initial set of params to use in querying Facebook
    fields: 'message,name',
    limit: 100
  };
  done = false; // will be set to true to terminate loop
  async.doUntil(function(callback) {
    // body of the loop
    FB.napi(feed, params, function(err, result) {
      if (err) return callback(err);
      totalResults = totalResults.concat(result.data);
      if (!result.paging.next || totalResults.length >= 1000) {
        done = true;
      } else {
        params = URL.parse(result.paging.next, true).query;
      }
      callback();
    }); // FB.napi
  }, function() {
    // test for loop termination
    return done;
  }, function (err) {
    // completed looping
    if (err && err.type == 'OAuthException') {
      // the access token has expired since we acquired it, so get it again
      console.error('Need to reauthenticate with Facebook: %s', err.message);
      acquireFacebookToken(function (err) {
        if (!err) {
          // Now try again (n.b. setImmediate requires Node v10)
          setImmediate(function() {  
            processFacebookFeed(f);
          }); // setImmediate
        } else if (f) {
          f(err);
        }
      }); // acquireFacebookToken
    } else if (f) {
      f(err, totalResults);
    }
  }); // async.doUntil
}
