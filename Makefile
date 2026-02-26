COVERAGE ?= false

.PHONY: compile test-unit

compile:
	pnpm run compile

test-unit: compile
ifeq ($(COVERAGE),true)
	pnpm run test:coverage
else
	pnpm run test
endif
