#!/bin/sh
set -e
export NO_COLOR=1
export FORCE_COLOR=0
node push-db.js
exec node dist/main.js
