# Whatever it is you want to do, it should be handled by the
# by the main (parent) Makefile. So reissue make from there.
.PHONY: all

#: Default runs node-checks
all: node-checks

#: Run just the nodejs tests
node-checks:
	$(MAKE) -C .. $@

%:
	$(MAKE) -C .. $@
