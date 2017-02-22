#include "../includes/FindGitRepos.h"

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
  AsyncWorker(completionCallback), mPath(path), mProgressCallback(progressCallback)
{
  uv_async_init(uv_default_loop(), &mProgressCallbackAsync, &FindGitReposWorker::FireProgressCallback);
  mBaton.progressCallback = mProgressCallback;
  mBaton.progressQueue = &mProgressQueue;
  mProgressCallbackAsync.data = (void *)&mBaton;
}

void FindGitReposWorker::Execute() {
  uv_dirent_t directoryEntry;
  uv_fs_t scandirRequest;
  int error;
  std::queue<std::string> pathQueue;
  pathQueue.push(mPath);

  while (pathQueue.size()) {
    std::string currentPath = pathQueue.front();
    pathQueue.pop();

    if (uv_fs_scandir(NULL, &scandirRequest, currentPath.c_str(), 0, NULL) < 0) {
      continue;
    }

    while (uv_fs_scandir_next(&scandirRequest, &directoryEntry) != UV_EOF) {
      if (directoryEntry.type != UV_DIRENT_DIR) {
        continue;
      }

      std::string nextPath = currentPath + "/" + directoryEntry.name;

      if (!strcmp(directoryEntry.name, ".git")) {
        mProgressQueue.enqueue(nextPath);
        mRepositories.push_back(nextPath);
        uv_async_send(&mProgressCallbackAsync);
        continue;
      }

      pathQueue.push(nextPath);
    }
  }
}

void FindGitReposWorker::FireProgressCallback(uv_async_t *handle) {
  Nan::HandleScope scope;
  FindGitReposProgressBaton *baton = (FindGitReposProgressBaton *)handle->data;

  int numRepos = baton->progressQueue->count();

  v8::Local<v8::Array> repositoryArray = New<v8::Array>(numRepos);

  for (unsigned int i = 0; i < numRepos; ++i) {
    repositoryArray->Set(i, New<v8::String>(baton->progressQueue->dequeue()).ToLocalChecked());
  }

  v8::Local<v8::Value> argv[] = { repositoryArray };

  baton->progressCallback->Call(1, argv);
}

void FindGitReposWorker::HandleOKCallback() {
  // clean up our resources
  uv_close(reinterpret_cast<uv_handle_t*>(&mProgressCallbackAsync), NULL);
  delete mProgressCallback;
  mProgressQueue.clear();

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
