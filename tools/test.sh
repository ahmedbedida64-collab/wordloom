#!/usr/bin/env bash
# Quick CLI runner for Wordloom test suite
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
node "$DIR/run_all_tests.js"
