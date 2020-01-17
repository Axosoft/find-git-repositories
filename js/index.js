const { findGitRepos } = require('../build/Release/findGitRepos.node');

module.exports = (startingPath, progressCallback, { throttleTimeoutMS = 0 } = {}) => new Promise((resolve, reject) => {
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
      startingPath,
      throttleTimeoutMS,
      progressCallback,
      resolve
    );
  } catch (error) {
    reject(error);
  }
});
