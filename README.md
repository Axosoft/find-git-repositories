# findGitRepos

```javascript
const findGitRepos = require('findGitRepos');
findGitRepos('some/path', repos => console.log('progress:', repos))
  .then(allFoundRepositories => console.log('all the repositories found in this search:', allFoundRepositories));
```
