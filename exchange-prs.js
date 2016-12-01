var fetch = require('isomorphic-fetch');

module.exports = function (ctx, cb) {
  var token = ctx.data['github-token'];
  var prsPromise = [
    'mulesoft/exchange-ui',
    'mulesoft/asset-manager',
    'mulesoft/asset-manager-db',
    'mulesoft/anypoint-vcs',
    'mulesoft/anypoint-vcs-db',
    'mulesoft/exchange-maven-facade',
    'mulesoft/exchange-xapi',
    'mulesoft/asset-portal-service',
    'mulesoft/asset-portal-service-db',
    'mulesoft/repository-service',
    'mulesoft/repository-service-db'
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
          return new Date(a.updated_at) - new Date(b.updated_at);
        })
        .map(function (pr) {
          return ':pushpin: ' + pr.title + '\n:link: ' + pr.html_url + '\n:speaking_head_in_silhouette: ' + pr.user.login + '\n\n\n';
        }).join('\n');
        
      cb(null, {
        response_type: 'in_channel',
        text: 'Pending PRs: \n' + result,
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