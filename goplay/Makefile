# Copyright 2013 Rocky Bernstein

# Comments starting with #: below are remake GNU Makefile comments. See
# https://github.com/rocky/remake/wiki/Rake-tasks-for-gnu-make

.PHONY: run check test

#: run the code
run: goplay
	./goplay

#: same as "make check"
test: check

#: Run tests via buster.js
check:
	cd .. && make test

#: Build the goplay executable
goplay: goplay.go
	go build goplay.go
