# Copyright 2013 Rocky Bernstein

# Comments starting with #: below are remake GNU Makefile comments. See
# https://github.com/rocky/remake/wiki/Rake-tasks-for-gnu-make

BROWSER ?= google-chrome

.PHONY: run goplay check node-checks

#: run the code
run:
	cd goplay && make run

#: Build the goplay executable
goplay:
	cd goplay && make goplay

#: Run tests
check: node-checks

#: same as check
test: check

#: node.js checks
node-checks: test/node_modules
	cd test/nodejs && for test in *-test.js; do node $$test; done

#: static HTML checks
static-checks: test/node_modules
	cd test && (buster static & $(BROWSER) http://localhost:8282)

#: We use buster and buster-test for testing
test/node_modules:
	cd test && sudo npm link buster buster-test

#: Install buster and buster-test
buster-test: buster
	sudo npm -g buster-test

buster:
	sudo npm -g buster
