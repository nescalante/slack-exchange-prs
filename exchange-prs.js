module.exports = function (ctx, cb) {
  cb(null, {
    response_type: 'in_channel',
    text: 'Hello from @' + ctx.body.user_name + '!',
  });
};
