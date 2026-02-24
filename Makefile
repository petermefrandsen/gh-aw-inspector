COVERAGE ?= false

.PHONY: compile test-unit

compile:
	pnpm run compile

test-unit: compile
ifeq ($(COVERAGE),true)
	pnpm run test:coverage 2>&1 | tee coverage-output.txt
else
	pnpm run test
endif
