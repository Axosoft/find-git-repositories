const assert = require('assert');
const fs = require('fs');
const mlog = require('mocha-logger');
const path = require('path');

const createTree = require('./createTree');
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

  describe('Features', function() {
    this.timeout(4 * 60 * 1000);

    const basePath = path.resolve('.', 'fs');
    const breadth = 5;
    const depth = 8;

    before(function() {
      const { numDirs, repositoryPaths } = createTree(basePath, breadth, depth);
      this.repositoryPaths = repositoryPaths;
      mlog.log(`[FS] Breadth: ${breadth}`);
      mlog.log(`[FS] Depth: ${depth}`);
      mlog.log(`[FS] Directory Count: ${numDirs}`);
    });

    beforeEach(function() {
      const { repositoryPaths } = this;
      Object.keys(repositoryPaths).forEach(repositoryPath => {
        repositoryPaths[repositoryPath] = false;
      });
    });

    it('can find all repositories in a file system', function(done) {
      const { repositoryPaths } = this;
      let callbackPromisesChain = Promise.resolve();
      let triggeredProgressCallbackOnce = false;

      const progressCallback = paths => {
        triggeredProgressCallbackOnce = true;

        callbackPromisesChain = paths.reduce((chain, repositoryPath) =>
          chain.then(() => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );
            assert.equal(repositoryPaths[repositoryPath], false, 'Duplicate repositoryPath received');
            repositoryPaths[repositoryPath] = true;
          }), callbackPromisesChain);
      };

      findGitRepos(basePath, progressCallback)
        .then(paths => Promise.all([paths, callbackPromisesChain]))
        .then(([paths]) => {
          assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
          paths.forEach(repositoryPath => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );
            repositoryPaths[repositoryPath] = true;
          });

          Object.keys(repositoryPaths).forEach(repositoryPath => {
            assert.equal(repositoryPaths[repositoryPath], true, 'Did not find a path in the file system');
          });
        })
        .then(() => done())
        .catch(error => done(error));
    });

    it('will not follow symlinks', function(done) {
      const { repositoryPaths } = this;
      const linkPathA = path.resolve(basePath, 'folder_a');
      const linkPathB = path.resolve(basePath, 'folder_b');
      let callbackPromisesChain = Promise.resolve();
      let triggeredProgressCallbackOnce = false;

      const progressCallback = paths => {
        triggeredProgressCallbackOnce = true;

        callbackPromisesChain = paths.reduce((chain, repositoryPath) =>
          chain.then(() => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );
            assert.equal(repositoryPaths[repositoryPath], false, 'Duplicate repositoryPath received');
            repositoryPaths[repositoryPath] = true;
          }), callbackPromisesChain);
      };

      // set up link loop
      fs.mkdirSync(linkPathA);
      fs.mkdirSync(linkPathB);
      fs.symlinkSync(linkPathB, path.join(linkPathA, 'to_b'));
      fs.symlinkSync(linkPathA, path.join(linkPathB, 'to_a'));

      findGitRepos(basePath, progressCallback)
        .then(paths => Promise.all([paths, callbackPromisesChain]))
        .then(([paths]) => {
          assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
          paths.forEach(repositoryPath => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );
            repositoryPaths[repositoryPath] = true;
          });

          Object.keys(repositoryPaths).forEach(repositoryPath => {
            assert.equal(repositoryPaths[repositoryPath], true, 'Did not find a path in the file system');
          });
        })
        .then(() => done())
        .catch(error => done(error));
    });

    if (process.platform === 'win32') {
      it('will work when given the disk to search', function(done) {
        this.timeout(15 * 60 * 1000);

        const { repositoryPaths } = this;
        let callbackPromisesChain = Promise.resolve();
        let triggeredProgressCallbackOnce = false;

        const progressCallback = paths => {
          triggeredProgressCallbackOnce = true;

          callbackPromisesChain = paths.reduce((chain, repositoryPath) =>
            chain.then(() => {
              // only check repositories we know should exist
              if (
                repositoryPath.indexOf(path.resolve('.')) !== 0 ||
                path.dirname(repositoryPath) === path.resolve('.')
              ) {
                return;
              }

              assert.equal(
                repositoryPaths[repositoryPath],
                Boolean(repositoryPaths[repositoryPath]),
                `Found a repo that should not exist, ${repositoryPath}`
              );
              assert.equal(repositoryPaths[repositoryPath], false, 'Duplicate repositoryPath received');
              repositoryPaths[repositoryPath] = true;
            }), callbackPromisesChain);
        };

        findGitRepos('C:\\', progressCallback)
          .then(paths => Promise.all([paths, callbackPromisesChain]))
          .then(([paths]) => {
            assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
            paths.forEach(repositoryPath => {
              // only check repositories we know should exist
              if (
                repositoryPath.indexOf(path.resolve('.')) !== 0 ||
                path.dirname(repositoryPath) === path.resolve('.')
              ) {
                return;
              }

              assert.equal(
                repositoryPaths[repositoryPath],
                Boolean(repositoryPaths[repositoryPath]),
                `Found a repo that should not exist, ${repositoryPath}`
              );
              repositoryPaths[repositoryPath] = true;
            });

            Object.keys(repositoryPaths).forEach(repositoryPath => {
              assert.equal(repositoryPaths[repositoryPath], true, 'Did not find a path in the file system');
            });
          })
          .then(() => done())
          .catch(error => done(error));
      });
    }
  });
});
