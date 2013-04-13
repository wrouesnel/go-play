# Copyright 2013 Rocky Bernstein

# Comments starting with #: below are remake GNU Makefile comments. See
# https://github.com/rocky/remake/wiki/Rake-tasks-for-gnu-make

.PHONY: run goplay

#: run the code
run:
	cd goplay && make run

#: Build the goplay executable
goplay:
	cd goplay && make goplay
