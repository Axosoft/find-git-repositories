#include "../includes/FindGitRepos.h"

#if defined(_WIN32)
#define S_ISDIR(m) ((m & 0170000 == 0040000))
#define S_ISLNK(m) ((m & 0170000 == 0120000))
#endif

NAN_METHOD(FindGitRepos)
{
  if (info.Length() < 1 || !info[0]->IsString())
    return ThrowError("Must provide starting path as first argument.");

  if (info.Length() < 2 || !info[1]->IsFunction())
    return ThrowError("Must provide progress callback as second argument.");

  if (info.Length() < 3 || !info[2]->IsFunction())
    return ThrowError("Must provide completion callback as third argument.");

  v8::String::Utf8Value utf8Value(info[0]->ToString());
  std::string path = std::string(*utf8Value);

  Callback *progressCallback = new Callback(info[1].As<v8::Function>()),
           *completionCallback = new Callback(info[2].As<v8::Function>());

  AsyncQueueWorker(new FindGitReposWorker(path, progressCallback, completionCallback));
}

FindGitReposWorker::FindGitReposWorker(std::string path, Callback *progressCallback, Callback *completionCallback):
  AsyncWorker(completionCallback), mPath(path)
{
  mProgressAsyncHandle = new uv_async_t;

  uv_async_init(uv_default_loop(), mProgressAsyncHandle, &FindGitReposWorker::FireProgressCallback);

  mBaton = new FindGitReposProgressBaton;
  mBaton->progressCallback = progressCallback;
  mProgressAsyncHandle->data = reinterpret_cast<void *>(mBaton);
}

void FindGitReposWorker::Execute() {
  uv_dirent_t directoryEntry;
  uv_fs_t scandirRequest;
  std::queue<std::string> pathQueue;
  pathQueue.push(mPath);

  while (pathQueue.size()) {
    std::string currentPath = pathQueue.front();
    pathQueue.pop();

    if (uv_fs_scandir(NULL, &scandirRequest, (currentPath + '/').c_str(), 0, NULL) < 0) {
      continue;
    }


    while (uv_fs_scandir_next(&scandirRequest, &directoryEntry) != UV_EOF) {
      std::string nextPath = currentPath + '/' + directoryEntry.name;

      if (
        directoryEntry.type == UV_DIRENT_UNKNOWN
      ) {
        uv_fs_t lstatRequest;
        if (
          uv_fs_lstat(NULL, &lstatRequest, nextPath.c_str(), NULL) < 0
          || !S_ISDIR(lstatRequest.statbuf.st_mode)
          || S_ISLNK(lstatRequest.statbuf.st_mode)
        ) {
          continue;
        }
      } else if (directoryEntry.type != UV_DIRENT_DIR) {
        continue;
      }

      if (!strcmp(directoryEntry.name, ".git")) {
        mBaton->progressQueue.enqueue(nextPath);
        mRepositories.push_back(nextPath);
        uv_async_send(mProgressAsyncHandle);
        continue;
      }

      pathQueue.push(nextPath);
    }
  }
}

void FindGitReposWorker::FireProgressCallback(uv_async_t *progressAsyncHandle) {
  Nan::HandleScope scope;
  FindGitReposProgressBaton *baton = reinterpret_cast<FindGitReposProgressBaton *>(progressAsyncHandle->data);

  int numRepos = baton->progressQueue.count();

  v8::Local<v8::Array> repositoryArray = New<v8::Array>(numRepos);

  for (unsigned int i = 0; i < (unsigned int)numRepos; ++i) {
    repositoryArray->Set(i, New<v8::String>(baton->progressQueue.dequeue()).ToLocalChecked());
  }

  v8::Local<v8::Value> argv[] = { repositoryArray };

  baton->progressCallback->Call(1, argv);
}

void FindGitReposWorker::CleanUpProgressBatonAndHandle(uv_handle_t *progressAsyncHandle) {
  // Libuv is done with this handle in this callback
  FindGitReposProgressBaton *baton = reinterpret_cast<FindGitReposProgressBaton *>(progressAsyncHandle->data);
  baton->progressQueue.clear();
  delete baton->progressCallback;
  delete baton;
  delete reinterpret_cast<uv_async_t *>(progressAsyncHandle);
}

void FindGitReposWorker::HandleOKCallback() {
  uv_close(reinterpret_cast<uv_handle_t*>(mProgressAsyncHandle), &FindGitReposWorker::CleanUpProgressBatonAndHandle);

  // dump vector of repositories into js callback
  v8::Local<v8::Array> repositoryArray = New<v8::Array>((int)mRepositories.size());

  for (unsigned int i = 0; i < mRepositories.size(); ++i) {
    repositoryArray->Set(i, New<v8::String>(mRepositories[i]).ToLocalChecked());
  }

  v8::Local<v8::Value> argv[] = { repositoryArray };

  callback->Call(1, argv);
}

NAN_MODULE_INIT(Init)
{
  Set(
    target,
    New<v8::String>("findGitRepos").ToLocalChecked(),
    New<v8::FunctionTemplate>(FindGitRepos)->GetFunction()
  );
}

NODE_MODULE(findGitRepos, Init)
