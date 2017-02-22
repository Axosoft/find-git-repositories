const findGitRepos = require('../');

describe('findGitRepos', function() {
  describe('Arguments', function() {
    it('will fail if not provided a path', function(done) {
      findGitRepos()
      .then(() => done('Should not have succeeded'))
      .catch(() => done());
    });

    it('will fail if not provided a progress callback', function(done) {
      findGitRepos('test')
      .then(() => done('Should not have succeeded'))
      .catch(() => done());
    });
  });
});
