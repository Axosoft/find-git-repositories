# find-git-repositories

```javascript
const findGitRepos = require('find-git-repositories');
findGitRepos('some/path', repos => console.log('progress:', repos))
  .then(allFoundRepositories => console.log('all the repositories found in this search:', allFoundRepositories));
```
