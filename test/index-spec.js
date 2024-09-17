const assert = require('assert');
const fs = require('fs');
const mlog = require('mocha-logger');
const path = require('path');

const createTree = require('./util/createTree');
const findGitRepos = require('..');

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

    it('will fail if throttleTimeoutMS value is not a number', function(done) {
      findGitRepos('test', () => {}, { throttleTimeoutMS: 'WrongValue' })
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });

    it('will fail if throttleTimeoutMS number is less than 0', function(done) {
      findGitRepos('test', () => {}, { throttleTimeoutMS: -1 })
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });

    it('will fail if throttleTimeoutMS number is larger than 60000', function(done) {
      findGitRepos('test', () => {}, { throttleTimeoutMS: 60001 })
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });

    it('will fail if maxSubfolderDeep is not a number', function(done) {
      findGitRepos('test', () => {}, { maxSubfolderDeep: 'WrongValue' })
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });

    it('will fail if maxSubfolderDeep number is less than 0', function(done) {
      findGitRepos('test', () => {}, { maxSubfolderDeep: -1 })
        .then(() => done('Should not have succeeded'))
        .catch(() => done());
    });
  });

  describe('Features', function() {
    this.timeout(4 * 60 * 1000);

    const rootPath = path.parse(path.resolve('.')).root;
    const basePath = process.platform === 'win32'
      ? path.join(rootPath, 'fs')
      : path.resolve('.', 'fs');
    const breadth = 8;
    const depth = 8;

    before(function() {
      const start = Date.now();
      const { numDirs, repositoryPaths } = createTree(basePath, breadth, depth);

      mlog.log(`[FS] Time to Generate Test Tree: ${Date.now() - start}ms`);
      mlog.log(`[FS] Max Breadth: ${breadth}`);
      mlog.log(`[FS] Max Depth: ${depth}`);
      mlog.log(`[FS] Directory Count: ${numDirs}`);

      this.repositoryPaths = repositoryPaths;
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

      findGitRepos(basePath, progressCallback, { throttleTimeoutMS: 100 })
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
              if (repositoryPath.indexOf(basePath) !== 0) {
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

        findGitRepos(rootPath, progressCallback)
          .then(paths => Promise.all([paths, callbackPromisesChain]))
          .then(([paths]) => {
            assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
            paths.forEach(repositoryPath => {
              // only check repositories we know should exist
              if (repositoryPath.indexOf(basePath) !== 0) {
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

    it('can find repositories at a specified subfolders depth in a file system', function(done) {
      const maxSubfolderDeep = 2;
      const basePathSubfolderDeep = basePath.split(path.sep).length;
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
            
            const currentSubfolderDeep = repositoryPath.split(path.sep).length;
            assert.equal(
              (currentSubfolderDeep - basePathSubfolderDeep) <= maxSubfolderDeep,
              true,
              'Found a repo that is too deep'
            );

            assert.equal(repositoryPaths[repositoryPath], false, 'Duplicate repositoryPath received');
            repositoryPaths[repositoryPath] = true;
          }), callbackPromisesChain);
      };

      findGitRepos(basePath, progressCallback, { maxSubfolderDeep: maxSubfolderDeep })
        .then(paths => Promise.all([paths, callbackPromisesChain]))
        .then(([paths]) => {
          assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
          paths.forEach(repositoryPath => {
            assert.equal(
              repositoryPaths[repositoryPath],
              Boolean(repositoryPaths[repositoryPath]),
              'Found a repo that should not exist'
            );

            const currentSubfolderDeep = repositoryPath.split(path.sep).length;
            assert.equal(
              (currentSubfolderDeep - basePathSubfolderDeep) <= maxSubfolderDeep,
              true,
              'Found a repo that is too deep'
            );

            repositoryPaths[repositoryPath] = true;
          });

          Object.keys(repositoryPaths)
            .filter(repositoryPath => {
              const currentSubfolderDeep = repositoryPath.split(path.sep).length;
              return (currentSubfolderDeep - basePathSubfolderDeep) <= maxSubfolderDeep;
            })
            .forEach(repositoryPath => {
              assert.equal(repositoryPaths[repositoryPath], true, 'Did not find a path in the file system');
            });
        })
        .then(() => done())
        .catch(error => done(error));
    });

    it('can cancel the repository search', function(done) {
      const { repositoryPaths } = this;

      let callbackPromisesChain = Promise.resolve();
      let triggeredProgressCallbackOnce = false;

      const maxCallbackCalls = 3;
      let numCallbackCalls = 0;

      const progressCallback = paths => {
        triggeredProgressCallbackOnce = true

        callbackPromisesChain = paths.reduce((chain, repositoryPath) =>
          chain.then(() => {
            repositoryPaths[repositoryPath] = true;
          }), callbackPromisesChain);

        if (numCallbackCalls >= maxCallbackCalls) {
          return true;
        }

        numCallbackCalls++;
      };

      findGitRepos(basePath, progressCallback)
        .then(paths => Promise.all([paths, callbackPromisesChain]))
        .then(([paths]) => {
          assert.equal(triggeredProgressCallbackOnce, true, 'Never called progress callback');
          paths.forEach(repositoryPath => {
            repositoryPaths[repositoryPath] = true;
          });

          const totalProcessedPaths = Object.keys(repositoryPaths).filter(repositoryPath => repositoryPaths[repositoryPath]).length;
          const totalPaths = Object.keys(repositoryPaths).length;

          assert.equal(totalProcessedPaths < totalPaths, true, 'Did not cancel the search');
        })
        .then(() => done())
        .catch(error => done(error));
    });
  });
});
