# Copyright 2013 Rocky Bernstein

# Comments starting with #: below are remake GNU Makefile comments. See
# https://github.com/rocky/remake/wiki/Rake-tasks-for-gnu-make

.PHONY: run goplay check node-checks

#: run the code
run:
	cd goplay && make run

#: Build the goplay executable
goplay:
	cd goplay && make goplay

#: Run tests
check: node-checks

#: node.js checks
node-checks: test/node_modules
	cd test && node basic-test.js

test/node_modules:
	cd test && sudo npm link buster
