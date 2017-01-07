var fetch = require('isomorphic-fetch');

module.exports = function (ctx, cb) {
  var token = ctx.data['github-token'];
  var prsPromise = [
    'mulesoft/anypoint-vcs',
    'mulesoft/anypoint-vcs-db',
    'mulesoft/asset-manager',
    'mulesoft/asset-manager-db',
    'mulesoft/asset-portal-service',
    'mulesoft/asset-portal-service-db',
    'mulesoft/asset-review-service',
    'mulesoft/asset-review-service-db',
    'mulesoft/exchange-custom-assets-facade',
    'mulesoft/exchange-dependency-resolver',
    'mulesoft/exchange-graph-service',
    'mulesoft/exchange-maven-facade',
    'mulesoft/exchange-ui',
    'mulesoft/exchange-xapi',
    'mulesoft/exchange2-kubernetes',
    'mulesoft/microservice-template',
    'mulesoft/repository-service',
    'mulesoft/repository-service-db'
  ].map(function (repo) {
    return fetchPR(repo);
  });
  
  Promise.all(prsPromise)
    .then(function (prs) { 
      return prs.reduce(function(a, b) {
        return a.concat(b);
      }, []);
    })
    .then(function (prs) {
      var prsWithReviews = prs.map(addReviews);
      
      return Promise.all(prsWithReviews);
    })
    .then(function (prs) {
      var result = prs
        .sort(function(a, b){
          return new Date(a.updated_at) - new Date(b.updated_at);
        })
        .map(function (pr) {
          const ms = new Date() - new Date(pr.updated_at);
          const secs = ms / 1000;
          const mins = secs / 60;
          const hours = mins / 60;
          var lastUpdated;
          
          if (hours < 1) {
            lastUpdated = 'hace ' + Math.round(mins) + ' minuto' + (mins == 1 ? '' : 's');
          } else {
            lastUpdated = 'hace ' + Math.round(hours) + ' hora' + (hours == 1 ? '' : 's');
          }
          
          var prColor = '#eee';
          var text = 'Actualizado ' + lastUpdated + '.\n\n';
          
          const changesRequested = pr.reviews
            .filter(function (review) { return review.state === 'CHANGES_REQUESTED'; })
            .map(function (review) { return review.user.login; });
          const approved = pr.reviews
            .filter(function (review) { return review.state === 'APPROVED'; })
            .map(function (review) { return review.user.login; });
          const requestedReviewers = pr.requested_reviewers
            .map(function (reviewer) { return reviewer.login; })
            .filter(function (reviewer) { 
              return !changesRequested.find(function (user) { return user === reviewer; }) &&
                !approved.find(function (user) { return user === reviewer; });
            });
            
          if (approved.length) {
            text += listUsers(approved) + ' aprob' + (approved.length === 1 ? 'ó' : 'aron') + ' el PR';
            
            if (!changesRequested.length) { 
              text += ' y ya está listo para ser mergeado :muscle:';
              prColor = '#1b6';
            } else {
              text += ':+1:';
            }
            
            text += '\n';
          }
          
          if (changesRequested.length) {
            text += listUsers(changesRequested) + ' pidi' + (changesRequested.length === 1 ? 'ó' : 'eron') + ' cambios :pray:\n';
            prColor = '#fb2';
          }
          
          if (requestedReviewers.length) {
            text += listUsers(requestedReviewers) + ' esta' + (requestedReviewers.length === 1 ? '' : 'n') + ' asignad' + (requestedReviewers.length === 1 ? 'x' : 'os') + ' para revisar el PR :nerd_face:\n';
            prColor = '#0ad';
          }
          
          if (!approved.length && !changesRequested.length && !requestedReviewers.length) {
            text += 'Nadie revisó este PR, ni nadie está asignado para revisarlo :sweat:\n';
            prColor = '#d34';
          }
          
          return {
            fallback: pr.html_url,
            color: prColor,
            author_name: pr.user.login,
            author_link: pr.user.html_url,
            author_icon: pr.user.avatar_url,
            title: pr.title + ' en ' + pr.base.repo.name,
            title_link: pr.html_url,
            text: text
          };
        });
        
      cb(null, {
        response_type: 'in_channel',
        text: 'Hola de nuevo equipo :wave:\nTienen *' + prs.length + ' PR' + (prs.length === 1 ? '' : 's') + '* pendiente' + (prs.length === 1 ? '' : 's') + ' :frowning:\n',
        attachments: result
      });
    })
    .catch(function (err) {
      cb(null, {
        text: err.message
      });
    });

  function fetchPR(repo) {
    var headers = {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github.black-cat-preview+json'
    };
    
    return fetch('https://api.github.com/repos/' + repo + '/pulls', { headers: headers })
      .then(function (response) {
        return response.json();
      });
  }
  
  function listUsers(users) {
    return users.length === 0 ? '' : users.length === 1 ? users[0] : users.slice(0, users.length - 1).join(', ') + ' y ' + users[users.length - 1];
  }
  
  function addReviews(pr) {
    var headers = {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github.black-cat-preview+json'
    };
    
    return fetch('https://api.github.com/repos/' + pr.head.repo.full_name + '/pulls/' + pr.number + '/reviews', { headers: headers })
      .then(function (response) {
        return response.json();
      })
      .then(function (json) {
        pr.reviews = json;
        
        return pr;
      });
  }
};