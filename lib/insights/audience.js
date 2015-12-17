var _ = require('lodash');
var assert = require('assert-plus');

var OAuth = require('oauth');
var OAuth2 = OAuth.OAuth2;
var request = require('superagent')
require('superagent-oauth')(request);


function Audience(options) {
  assert.object(options, 'options');
  assert.string(options.consumer_key, 'options.consumer_key');
  assert.string(options.consumer_secret, 'options.consumer_secret');
  
	var defaults = {
		request_token_url: 'https://twitter.com/oauth/request_token',
		access_token_url: 'https://twitter.com/oauth/access_token',

		version: '1.0A',
		authorize_callback: null,
		signature_method: 'HMAC-SHA1'
	};
	
	var opts = _.assign(defaults, options);

	this.auth = _.pick(opts, ['consumer_key', 'consumer_secret', 'access_token', 'access_token_secret'])
  this.endpoint = options.endpoint || 'https://data-api.twitter.com/';
  this.oauth = new OAuth.OAuth(opts.request_token_url, opts.access_token_url, opts.consumer_key, opts.consumer_secret, opts.version, opts.authorize_callback, opts.signature_method);
};

Audience.prototype.end = function(meta, callback) {
	return function (err, res) {
		if (err) {
			// Include the error details returned by the Gnip API
			var err = _.merge(err, res.body.error);
      err.meta = meta;

			return callback(err, res);
		}

		return callback(null, res);
	};
}

Audience.prototype.post = function(uri, body) {
	var self = this;
	
	return new Promise(function(resolve, reject) {
		function callback(err, res) {
			if (err) {
				return reject(err);
			}
			
			return resolve(res);
		}
    
    // self.oauth.post(self.endpoint + uri, self.auth.access_token, self.auth.access_token_secret, JSON.stringify(body), 'application/json', function(err, data, res) {
    //   if (err) {
    //     return reject(err);
    //   }
      
    //   return resolve(data);
    // });
    
		request.post(self.endpoint + uri)
			.sign(self.oauth, self.auth.access_token, self.auth.access_token_secret)
      .send(body)
			// .set('X-My', 'Header')
			.end(self.end({ endpoint: self.endpoint,  uri: uri, method: 'POST' }, callback));
	});
};

Audience.prototype.get = function(uri, query) {
	var self = this;
	
	return new Promise(function(resolve, reject) {
		function callback(err, res) {
			if (err) {
				return reject(err);
			}
			
			return resolve(res);
		}
		
		request.get(self.endpoint + uri)
			.query(query || {})
			.sign(self.oauth, self.auth.access_token, self.auth.access_token_secret)
			// .set('X-My', 'Header')
			.end(self.end({ endpoint: self.endpoint, uri: uri, query: query, method: 'GET' }, callback));
	});
};

Audience.prototype.createUserSegment = function(name) {
  assert.string(name, 'name');
  
	return this.post('insights/audience/segments', { name: name });
};

Audience.prototype.getUserSegment = function(id) {
  assert.string(id, 'id');
  
	return this.get('insights/audience/segments/' + id);
};

// NOTE: doesn't dedup ids on insert
Audience.prototype.appendUsersToSegment = function(id, ids) {
  assert.string(id, 'id');
  assert.arrayOfString(ids, 'ids');
  
  return this.post('insights/audience/segments/' + id + '/ids', { user_ids: ids });
};

Audience.prototype.createAudience = function(name, segments) {
  assert.string(name, 'name');
  assert.arrayOfString(segments, 'segments');
  
  return this.post('insights/audience/audiences', { name: name, segment_ids: segments });
}

Audience.prototype.query = function(id, groupings) {
  assert.string(id, 'id');
  assert.object(groupings, 'groupings');
  
  return this.post('insights/audience/audiences/' + id + '/query', { groupings: groupings });
}

Audience.prototype.usage = function() {
  return this.get('insights/audience/usage');
}

module.exports = Audience;