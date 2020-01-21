#ifndef WINDOWS_HELPERS_H
#define WINDOWS_HELPERS_H
#include <windows.h>

static void stripNTPrefix(std::wstring &path) {
  if (path.rfind(L"\\\\?\\UNC\\", 0) != std::wstring::npos) {
    path.replace(0, 7, L"\\");
  } else if (path.rfind(L"\\\\?\\", 0) != std::wstring::npos) {
    path.erase(0, 4);
  }
}

static int convertWideCharToMultiByte(std::string *out, std::wstring input, bool wasNtPath) {
  std::wstring _input = input;
  if (!wasNtPath) {
    stripNTPrefix(_input);
  }

  int utf8Length = WideCharToMultiByte(
    CP_UTF8,
    0,
    _input.c_str(),
    -1,
    0,
    0,
    NULL,
    NULL
  );
  out->resize(utf8Length - 1);
  return WideCharToMultiByte(
    CP_UTF8,
    0,
    _input.c_str(),
    -1,
    &(*out)[0],
    utf8Length,
    NULL,
    NULL
  );
}

static bool isNtPath(const std::wstring &path) {
  return path.rfind(L"\\\\?\\", 0) == 0 || path.rfind(L"\\??\\", 0) == 0;
}

static std::wstring prefixWithNtPath(const std::wstring &path) {
  const ULONG widePathLength = GetFullPathNameW(path.c_str(), 0, nullptr, nullptr);
  if (widePathLength == 0) {
    return path;
  }

  std::wstring ntPathString;
  ntPathString.resize(widePathLength - 1);
  if (GetFullPathNameW(path.c_str(), widePathLength, &(ntPathString[0]), nullptr) != widePathLength - 1) {
    return path;
  }

  return ntPathString.rfind(L"\\\\", 0) == 0
    ? ntPathString.replace(0, 2, L"\\\\?\\UNC\\")
    : ntPathString.replace(0, 0, L"\\\\?\\");
}

static std::wstring convertMultiByteToWideChar(const std::string &multiByte) {
  const int wlen = MultiByteToWideChar(CP_UTF8, 0, multiByte.data(), -1, 0, 0);

  if (wlen == 0) {
    return std::wstring();
  }

  std::wstring wideString;
  wideString.resize(wlen - 1);

  int failureToResolveUTF8 = MultiByteToWideChar(CP_UTF8, 0, multiByte.data(), -1, &(wideString[0]), wlen);
  if (failureToResolveUTF8 == 0) {
    return std::wstring();
  }

  return wideString;
}

#endif
