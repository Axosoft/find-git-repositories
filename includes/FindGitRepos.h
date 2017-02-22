#ifndef FindGitRepos_H
#define FindGitRepos_H

#include <nan.h>
#include <uv.h>
#include <vector>
#include <queue>
#include <iostream>

#include "./Queue.h"

using namespace Nan;

static NAN_MODULE_INIT(Init);

static NAN_METHOD(FindGitRepos);

struct FindGitReposProgressBaton {
  Callback *progressCallback;
  RepositoryQueue *progressQueue;
};

class FindGitReposWorker : public AsyncWorker {
public:
  static void FireProgressCallback(uv_async_t *handle);

  FindGitReposWorker(std::string path, Callback *progressCallback, Callback *completionCallback);
  void Execute();
  void HandleOKCallback();
private:
  FindGitReposProgressBaton mBaton;
  std::string mPath;
  Callback *mProgressCallback;
  uv_async_t mProgressCallbackAsync;
  RepositoryQueue mProgressQueue;
  std::vector<std::string> mRepositories;
};

#endif
