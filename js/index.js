const { findGitRepos } = require('../build/Release/findGitRepos.node');

const normalizeStartingPath = _path => process.platform === 'win32'
  ? _path.replace(/\\/g, '/')
  : _path;

const normalizeRepositoryPath = _path => _path.replace(/\//g, '\\');

module.exports = (startingPath, progressCallback) => new Promise((resolve, reject) => {
  if (!startingPath && startingPath !== '') {
    reject(new Error('Must provide starting path as first argument.'));
    return;
  }

  if (!progressCallback) {
    reject(new Error('Must provide progress callback as second argument.'));
    return;
  }

  const normalizedArguments = process.platform === 'win32'
    ? [
      normalizeStartingPath(startingPath),
      paths => progressCallback(paths.map(normalizeRepositoryPath)),
      paths => resolve(paths.map(normalizeRepositoryPath))
    ]
    : [startingPath, progressCallback, resolve];

  try {
    findGitRepos(...normalizedArguments);
  } catch (error) {
    reject(error);
  }
});
