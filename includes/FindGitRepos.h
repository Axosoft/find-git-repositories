#ifndef FindGitRepos_H
#define FindGitRepos_H

#include <nan.h>
#include <uv.h>
#include <vector>
#include <queue>
#include <chrono>

#include "./Queue.h"

using namespace Nan;

static NAN_MODULE_INIT(Init);

static NAN_METHOD(FindGitRepos);

struct FindGitReposProgressBaton {
  Callback *progressCallback;
  RepositoryQueue progressQueue;
};

class FindGitReposWorker : public AsyncWorker {
public:
  static void CleanUpProgressBatonAndHandle(uv_handle_t *progressAsyncHandle);
  static void FireProgressCallback(uv_async_t *progressAsyncHandle);

  FindGitReposWorker(std::string path, uint32_t throttleTimeoutMS, Callback *progressCallback, Callback *completionCallback);
  void Execute();
  void HandleOKCallback();
private:
  void ThrottledProgressCallback();

  FindGitReposProgressBaton *mBaton;
  std::chrono::steady_clock::time_point mLastScheduledCallbackMS;
  std::string mPath;
  uv_async_t *mProgressAsyncHandle;
  std::vector<std::string> mRepositories;
  uint32_t mThrottleTimeoutMS;
};

#endif
