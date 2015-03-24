# Intro #


A locally-run HTML5 web interface for experimenting with Go code.

This started out as a merge between http://play.golang.org, Go's [present](http://godoc.org/code.google.com/p/go.talks/present) package and `$GOROOT/misc/play`


# Features #

Basically since this runs on your computer you control any restrictions on what can be done. Specifically:

  * You can use with locally-installed go packages.
  * You can set build, test, and run options; set runtime-environment variables
  * No Internet access is needed
  * Data can be totally private
  * You can run long computations
  * The date and time are those set on the server

# Installing and Running #

To run download from git:
```
    git clone http://code.google.com/p/go-play
```

Running is pretty easy:
```
    cd go-play/goplay
    go run goplay.go
```

or if you want to build the binary first:

```
  cd go-play/goplay
  go build goplay.go
  ./goplay
```

Now in an HTML5-compliant web browser, load `http://localhost:3998/`

You should see the standard "Hello World" program, which you can
compile and run by pressing shift-enter.

# Options #

There are some rudimentary command options:

  * `--help`            gives a list of all options
  * `--http` _host_:_port_  gives host and port to listen on.

The default HTTP host and port is is `127.0.0.1:3998`


# Security #

Anyone with access to the goplay web interface can run arbitrary code
on your computer. Goplay is not a sandbox, and has no other security
mechanisms. Do not deploy it in untrusted environments.  By default,
goplay listens only on localhost. This can be overridden with the
`-http` parameter.