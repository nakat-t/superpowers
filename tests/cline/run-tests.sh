#!/usr/bin/env bash
# Cline plugin tests for superpowers.
#
# The plugin (.cline/plugins/superpowers.ts) imports `@cline/core` only as a
# type, which Node's type-stripping erases at load time, so these tests run the
# plugin directly with `node --experimental-strip-types` — no Cline runtime or
# npm install required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

node --experimental-strip-types --test "$SCRIPT_DIR/test-cline-plugin.mjs"
