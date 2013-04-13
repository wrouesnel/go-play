# Copyright 2013 Rocky Bernstein

# Comments starting with #: below are remake GNU Makefile comments. See
# https://github.com/rocky/remake/wiki/Rake-tasks-for-gnu-make

.PHONY: run

#: run the code
run: goplay
	./goplay

#: Build the goplay executable
goplay: goplay.go
	go build goplay.go
