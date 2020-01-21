# find-git-repositories
[![Actions Status](https://github.com/implausible/find-git-repositories/workflows/Tests/badge.svg)](https://github.com/implausible/find-git-repositories/actions)

```javascript
const findGitRepos = require('find-git-repositories');
findGitRepos('some/path', repos => console.log('progress:', repos))
  .then(allFoundRepositories => console.log('all the repositories found in this search:', allFoundRepositories));
```
