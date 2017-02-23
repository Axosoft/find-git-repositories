const { findGitRepos } = require('../build/Release/findGitRepos.node');

const normalizeStartingPath = _path => {
  const pathWithNormalizedSlashes = process.platform === 'win32'
    ? _path.replace(/\\/g, '/')
    : _path;

  return pathWithNormalizedSlashes.replace(/\/+$/, '');
};

const normalizeRepositoryPath = _path => _path.replace(/\//g, '\\');

const normalizePathCallback = callback => process.platform === 'win32'
  ? paths => callback(paths.map(normalizeRepositoryPath))
  : callback;

module.exports = (startingPath, progressCallback) => new Promise((resolve, reject) => {
  if (!startingPath && startingPath !== '') {
    reject(new Error('Must provide starting path as first argument.'));
    return;
  }

  if (!progressCallback) {
    reject(new Error('Must provide progress callback as second argument.'));
    return;
  }

  try {
    findGitRepos(
      normalizeStartingPath(startingPath),
      normalizePathCallback(progressCallback),
      normalizePathCallback(resolve)
    );
  } catch (error) {
    reject(error);
  }
});
