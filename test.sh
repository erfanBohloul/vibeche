#!/bin/bash
# Run Vibeche unit tests directly in your terminal using macOS's built-in JavaScript engine
osascript -l JavaScript -e '
  ObjC.import("Foundation");
  function load(file) {
    eval($.NSString.stringWithContentsOfFileEncodingError(file, $.NSUTF8StringEncoding, null).js);
  }
  load("js/books.js");
  load("tests/test_books.js");
  load("js/storage.js");
  load("tests/test_storage.js");
  load("js/catalog.js");
  load("tests/test_catalog.js");
  load("js/detail.js");
  load("tests/test_detail.js");
  load("js/library.js");
  load("tests/test_library.js");
' 2>&1
