const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

module.exports = (basePath, maxBreadth = 1, maxDepth = 1, isRepositoryThreshold = 0.5) => {
  const repositoryPaths = {};
  let numDirs = 0;
  const traverse = (_path, depth) => {
    numDirs++;
    fs.mkdirSync(_path);
    if (depth === maxDepth) {
      return;
    }
    for (let i = 0; i < maxBreadth; ++i) {
      traverse(path.join(_path, i.toString('16')), depth + 1);
    }

    if (Math.random() > isRepositoryThreshold) {
      const repositoryPath = path.join(_path, '.git');
      fs.mkdirSync(repositoryPath);
      repositoryPaths[path.resolve(repositoryPath)] = false;
    }
  };

  rimraf.sync(basePath);
  traverse(basePath, 0);

  const guaranteedRepoName = 'guaranteed_repo';
  const guaranteedPath = path.resolve(basePath, guaranteedRepoName, '.git');
  fs.mkdirSync(path.resolve(basePath, guaranteedRepoName));
  fs.mkdirSync(guaranteedPath);

  repositoryPaths[guaranteedPath] = false;

  return { numDirs, repositoryPaths };
};
