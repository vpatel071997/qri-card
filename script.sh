#!/bin/bash

FILE="src/index.tsx"

OS="$(uname -s)"
case "${OS}" in
    Linux*)     SED_OPTIONS="-i" ;;
    Darwin*)    SED_OPTIONS="-i ''" ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*) SED_OPTIONS="-i" ;;
    *)          echo "Unsupported OS: ${OS}" && exit 1 ;;
esac

if grep -q 'HashRouter as Router' "$FILE"; then
  # Replace HashRouter with BrowserRouter
  sed $SED_OPTIONS 's/HashRouter as Router/BrowserRouter as Router/' "$FILE"
  echo "Switched to BrowserRouter"
elif grep -q 'BrowserRouter as Router' "$FILE"; then
  # Replace BrowserRouter with HashRouter
  sed $SED_OPTIONS 's/BrowserRouter as Router/HashRouter as Router/' "$FILE"
  echo "Switched to HashRouter"
else
  echo "No recognizable Router import found."
  exit 1
fi
