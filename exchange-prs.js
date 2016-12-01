var fetch = require('isomorphic-fetch');

module.exports = function (ctx, cb) {
  var token = ctx.data['github-token'];
  var prsPromise = [
    'mulesoft/exchange-ui',
    'mulesoft/asset-manager'
  ].map(function (repo) {
    return fetchPRs(repo);
  });
  
  Promise.all(prsPromise)
    .then(function (prs) { 
      return prs.reduce(function(a, b) {
        return a.concat(b);
      }, []);
    })
    .then(function (prs) {
      var result = prs
        .sort(function(a, b){
          return new Date(b.updated_at) - new Date(a.updated_at);
        })
        .map(function (pr) {
          return '- ' + pr.html_url + ' (' + pr.title + ')';
        });
        
      cb(null, {
        // response_type: 'in_channel', // uncomment to have the response visible to everyone on the channel
        text: JSON.stringify(prs) + 'Hello, @' + ctx.body.user_name + '!'
      });
    })
    .catch(function (err) {
      cb(null, {
        // response_type: 'in_channel', // uncomment to have the response visible to everyone on the channel
        text: err.message
      });
    });

  function fetchPRs(repo) {
    var headers = {
      Authorization: 'token ' + token
    };
    
    return fetch('https://api.github.com/repos/' + repo + '/pulls', { headers: headers })
      .then(function (response) {
        return response.json();
      });
  }
};