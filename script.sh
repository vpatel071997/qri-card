#!/bin/bash

FILE="src/index.tsx"

if grep -q 'HashRouter as Router' "$FILE"; then
  # Replace HashRouter with BrowserRouter
  sed -i '' 's/HashRouter as Router/BrowserRouter as Router/' "$FILE"
  echo "Switched to BrowserRouter"
elif grep -q 'BrowserRouter as Router' "$FILE"; then
  # Replace BrowserRouter with HashRouter
  sed -i '' 's/BrowserRouter as Router/HashRouter as Router/' "$FILE"
  echo "Switched to HashRouter"
else
  echo "No recognizable Router import found."
  exit 1
fi