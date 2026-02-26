COVERAGE ?= false

.PHONY: compile test-unit

compile:
	pnpm run compile
	mkdir -p dist
	echo "module.exports = require('../out/extension');" > dist/extension.js

test-unit: compile
ifeq ($(COVERAGE),true)
	pnpm run test:coverage
else
	pnpm run test
endif
