const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

module.exports = (basePath, maxBreadth = 1, maxDepth = 1, isRepositoryThreshold = 0.5, limit = 50000) => {
  const repositoryPaths = {};
  let numDirs = 0;
  const traverse = (_path, depth) => {
    numDirs++;
    fs.mkdirSync(_path);
    if (depth === maxDepth || numDirs > limit) {
      return;
    }

    if (depth <= 2 || Math.random() <= isRepositoryThreshold) {
      for (let i = 0; i < maxBreadth; ++i) {
        traverse(path.join(_path, i.toString('16')), depth + 1);
      }
      return;
    }

    const repositoryPath = path.join(_path, '.git');
    fs.mkdirSync(repositoryPath);
    repositoryPaths[path.resolve(repositoryPath)] = false;

    // add a submodule that we shouldn't find in the tests
    fs.mkdirSync(path.join(_path, 'submodule'));
    fs.mkdirSync(path.join(_path, 'submodule', '.git'));
  };

  rimraf.sync(basePath);
  traverse(basePath, 0);

  const guaranteedRepoName = 'guaranteed_repo';
  const guaranteedPath = path.resolve(basePath, guaranteedRepoName, '.git');

  fs.mkdirSync(path.resolve(basePath, guaranteedRepoName));
  fs.mkdirSync(guaranteedPath);

  repositoryPaths[guaranteedPath] = false;

  // add a submodule that we shouldn't find in the tests
  fs.mkdirSync(path.resolve(basePath, guaranteedRepoName, 'submodule'));
  fs.mkdirSync(path.resolve(basePath, guaranteedRepoName, 'submodule', '.git'));

  return { numDirs, repositoryPaths };
};
