#!/bin/bash
# Run Vibeche unit tests directly in your terminal using macOS's built-in JavaScript engine
osascript -l JavaScript -e '
  ObjC.import("Foundation");
  function load(file) {
    eval($.NSString.stringWithContentsOfFileEncodingError(file, $.NSUTF8StringEncoding, null).js);
  }
  load("js/books.js");
  load("tests/test_books.js");
' 2>&1
