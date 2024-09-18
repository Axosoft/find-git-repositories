# find-git-repositories
[![Actions Status](https://github.com/Axosoft/find-git-repositories/workflows/Tests/badge.svg)](https://github.com/implausible/find-git-repositories/actions)

Find Git repositories in a directory and it's subfolders and return an array of paths to the found repositories.

## Usage

`findGitRepos(pathToSearch, progressCallback, options): Promise<string[]>`

#### Arguments

- `pathToSearch`: path to search for repositories in.
- `progressCallback`: function to be called with an array of found repositories.
  - Definition: `progressCallback(repositories: string[]): boolean`.
  - As optional, we could return `true` from the progress callback to cancel the search.
- `options`: optional object with the following properties:
  - `throttleTimeoutMS`: optional number of milliseconds to wait before calling the progress callback.
  - `maxSubfolderDeep`: optional maximum number of subfolders to search in.

### Basic example
```javascript
const findGitRepos = require('find-git-repositories');
findGitRepos('some/path', repos => console.log('progress:', repos))
  .then(allFoundRepositories => console.log('all the repositories found in this search:', allFoundRepositories));
```

### Example with options
```javascript
const findGitRepos = require('find-git-repositories');
findGitRepos(
  'some/path',
  repos => {
    console.log('progress:', repos);
    return shouldCancelSearch(); // Return true to cancel the search
  ),
  {
    throttleTimeoutMS: 100, // Only call the progress callback every 100ms
    maxSubfolderDeep: 2 // Only search in the first 2 subfolders
  }
).then(
  allFoundRepositories => console.log('all the repositories found in this search:', allFoundRepositories)
);
```

## How to build

Run `yarn` or `yarn install` to install dependencies and build the native addon in release mode.

## How to run tests

Run `yarn test`.

## How to debug (in VS Code and MacOS)

1. Install `CodeLLBD` addon for VS Code.
2. Modify the `main` property in the `package.json` file to point to `debug` instead of `release`: `"main": "build/Debug/findGitRepos.node",`.
3. Create a `.vscode/launch.json` file with the following content:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "attach",
      "name": "Attach",
      "pid": "${command:pickMyProcess}" // use ${command:pickProcess} to pick other users' processes
    }
  ]
}
```
4. Create a `.vscode/c_cpp_properties.json` file with a similar content: 
```json
{
   "configurations": [
      {
        "name": "Mac",
        "includePath": [
            "${workspaceFolder}/**",
            "/Users/MY_USER/.nvm/versions/node/v20.14.0/include/node/**" // enter your node path here
        ],
        "defines": [],
        "macFrameworkPath": [
            "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks"
        ],
        "compilerPath": "/usr/bin/clang",
        "cStandard": "c17",
        "cppStandard": "c++17",
        "intelliSenseMode": "macos-clang-x64"
      }
    ],
    "version": 4
}
```
5. Create a `.vscode/settings.json` file with the following content: 
```json
{
  "files.associations": {
    "__bit_reference": "cpp",
    "__bits": "cpp",
    "__config": "cpp",
    "__debug": "cpp",
    "__errc": "cpp",
    "__functional_base": "cpp",
    "__hash_table": "cpp",
    "__locale": "cpp",
    "__mutex_base": "cpp",
    "__node_handle": "cpp",
    "__nullptr": "cpp",
    "__split_buffer": "cpp",
    "__string": "cpp",
    "__threading_support": "cpp",
    "__tuple": "cpp",
    "algorithm": "cpp",
    "array": "cpp",
    "atomic": "cpp",
    "bit": "cpp",
    "bitset": "cpp",
    "cctype": "cpp",
    "chrono": "cpp",
    "clocale": "cpp",
    "cmath": "cpp",
    "complex": "cpp",
    "cstdarg": "cpp",
    "cstddef": "cpp",
    "cstdint": "cpp",
    "cstdio": "cpp",
    "cstdlib": "cpp",
    "cstring": "cpp",
    "ctime": "cpp",
    "cwchar": "cpp",
    "cwctype": "cpp",
    "exception": "cpp",
    "functional": "cpp",
    "initializer_list": "cpp",
    "ios": "cpp",
    "iosfwd": "cpp",
    "istream": "cpp",
    "iterator": "cpp",
    "limits": "cpp",
    "list": "cpp",
    "locale": "cpp",
    "memory": "cpp",
    "mutex": "cpp",
    "new": "cpp",
    "optional": "cpp",
    "ostream": "cpp",
    "ratio": "cpp",
    "sstream": "cpp",
    "stdexcept": "cpp",
    "streambuf": "cpp",
    "string": "cpp",
    "string_view": "cpp",
    "system_error": "cpp",
    "tuple": "cpp",
    "type_traits": "cpp",
    "typeinfo": "cpp",
    "unordered_map": "cpp",
    "utility": "cpp",
    "vector": "cpp"
  }
}
```
6. Run `npx node-gyp rebuild --debug` to install dependencies and build the native addon in debug mode.
7. Run your app with the debugger attached in VSCode and add a breakpoint.
8. When it stops at the breakpoint, run in the console: `process.pid` and copy the process number to use in the next step.
9. In the `find-git-repositories` VSCode project, click on the `Attach` button in the debug toolbar and enter the process number from the previous step.
10. Add breakpoints where ever you want to start debugging.


