// Copyright 2013 Rocky Bernstein.
// Copyright 2010 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// A local HTML5 server interface to load, edit, and run
// go programs.
//
// To run download from git:
//    git clone http://code.google.com/p/go-play
//
// And run:
//    cd go-play/goplay
//    go run goplay.go
//
// or:
//    cd go-play/goplay
//    go build goplay.go
//    ./goplay
//
// Then in a HTML5-enabled web browser, load http://localhost:3998/
//
// You should see the standard "Hello World" program, which you can
// compile and run by pressing shift-enter.
//
// Options
//
//    --help  give a list of all options
//    --http  host:port to listen on. The default is 127.0.0.1:3998
//
//
// Security
//
// Anyone with access to the goplay web interface
// can run arbitrary code on your computer. Goplay is not a sandbox,
// and has no other security mechanisms. Do not deploy it in untrusted
// environments.  By default, goplay listens only on localhost. This
// can be overridden with the --http parameter.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"text/template"
)

/************** FIXME: put in a separate file ****************/
import (
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
)

type fmtResponse struct {
	Body  string
	Error string
}

var tmpdir string

// FmtHandler handles a Go-source format request. The go source code
// is given in req and the formated output is passed back in w.  This
// routine must be called via an HTTP POST request.
func FmtHandler(w http.ResponseWriter, req *http.Request) {
	resp := new(fmtResponse)
	if req.Method != "POST" {
		http.Error(w, "Forbidden, need POST", http.StatusForbidden)
		return
	}
	body, err := gofmt(req.FormValue("body"))
	if err != nil {
		resp.Error = err.Error()
	} else {
		resp.Body = body
	}
	json.NewEncoder(w).Encode(resp)
}

func gofmt(body string) (string, error) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "prog.go", body, parser.ParseComments)
	if err != nil {
		return "", err
	}
	ast.SortImports(fset, f)
	var buf bytes.Buffer
	config := &printer.Config{Mode: printer.UseSpaces | printer.TabIndent, Tabwidth: 8}
	err = config.Fprint(&buf, fset, f)
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}
/*******************/

// CompileHandler is an HTTP handler that reads Go source code from req,
// runs the program (returning any errors),
// and sends the program's output as the HTTP response to w.
func CompileHandler(w http.ResponseWriter, req *http.Request) {
	out, err := compile(req)
	if err != nil {
		error_(w, out, err)
		return
	}

	// write the output of x as the http response
	if *htmlOutput {
		w.Write(out)
	} else {
		output.Execute(w, out)
	}
}

/*******************/

const DefaultSaveName = "save"
const GoPathSuffix    = ".go"

// SaveHandler writes a Go program to file.
//
// We have to do this in Go since HTML5 Doesn't grok file paths.
//
// In order to be able to distinguish relative versus absolute paths,
// we add an X in the URL. For example /save/X/tmp/save.go versus
// /save/Xtmp/save.go. The latter refers to ./tmp/save.go.
//
// This routine must be called via POST.
func SaveHandler(w http.ResponseWriter, req *http.Request) {
	filename := DefaultSaveName
	// +3 for enclosing "/X", e.g. "/save/X" not "save"
	SaveLen := len(DefaultSaveName) + 3
	if len(req.URL.Path) > SaveLen {
		filename = req.URL.Path[SaveLen:];
		if filename[0] != '/' {
			filename = filepath.Join(tmpdir, filename);
		}
	}
	if req.Method != "POST" {
		http.Error(w, "Forbidden, need POST", http.StatusForbidden)
		return
	}

	/** fmt.Printf("Req %s\n", req) **/
	body := new(bytes.Buffer)
	_, err := body.ReadFrom(req.Body)
	if err != nil {
		http.Error(w, "Server Error in SaveHandler reading Body text",
			http.StatusInternalServerError)
		return
	}
	req.Body.Close()

	if filename[len(filename)-len(GoPathSuffix):] != GoPathSuffix {
		filename += GoPathSuffix
	}
	err = ioutil.WriteFile(filename, body.Bytes(), 0600)
	if err != nil {
		fmt.Printf("Save Error: %s\n", err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Printf("File: %s saved\n", filename)
	w.Write([]byte(filename))
}

/*******************/

func ShareHandler(w http.ResponseWriter, req *http.Request) {
	fmt.Printf("Redirecting\n");
	http.Redirect(w, req, "http://play.golang.org/share", http.StatusFound)
}

/*******************/

var (
	httpListen = flag.String("http", "127.0.0.1:3998",
		"host:port to listen on")
	htmlOutput = flag.Bool("html", false, "render program output as HTML")
	resourceDir = "../static"
	resourceDirP = &resourceDir
	// resourceDir = flag.String("resource-root", "../static",
	// 	"Location of CSS and JavaScript resources")
)

var (
	// a source of numbers, for naming temporary files
	uniq = make(chan int)
)

func main() {
	flag.Parse()

	// source of unique numbers
	go func() {
		for i := 0; ; i++ {
			uniq <- i
		}
	}()

	// find real temporary directory (for rewriting filename in output)
	var err error
	tmpdir, err = filepath.EvalSymlinks(os.TempDir())
	if err != nil {
		log.Fatal(err)
	}
	http.HandleFunc("/", edit)
	http.HandleFunc("/compile", CompileHandler)
	http.HandleFunc("/fmt",     FmtHandler)
	http.HandleFunc("/save",    SaveHandler)
	http.HandleFunc("/share",   ShareHandler)
	http.HandleFunc("/save/",   SaveHandler)

	http.Handle("/static/", http.StripPrefix("/static/",
		http.FileServer(http.Dir("../static"))))
	fmt.Printf("Runnning Go Play. Attempting to listening on %s\n",
		*httpListen)
	log.Fatal(http.ListenAndServe(*httpListen, nil))
}

var editTemplate = template.Must(template.ParseFiles("goplay.html"))

type Snippet struct {
	Body []byte
}

type editData struct {
	Snippet *Snippet
	ResourceDir string
}

// edit is an HTTP handler that renders the goplay interface.
// If a filename is supplied in the path component of the URI,
// its contents will be put in the interface's text area.
// Otherwise, the default "hello, world" program is displayed.
func edit(w http.ResponseWriter, req *http.Request) {
	data, err := ioutil.ReadFile(req.URL.Path[1:])
	if err != nil {
		data = []byte(hello)
	}

	snip := &Snippet{Body: data}
	editTemplate.Execute(w, &editData{snip, *resourceDirP})
}

var (
	commentRe = regexp.MustCompile(`(?m)^#.*\n`)
)

func compile(req *http.Request) (out []byte, err error) {
	// x is the base name for .go, .6, executable files
	x := filepath.Join(tmpdir, "compile"+strconv.Itoa(<-uniq))
	src := x + ".go"
	bin := x
	if runtime.GOOS == "windows" {
		bin += ".exe"
	}

	// rewrite filename in error output
	defer func() {
		if err != nil {
			// drop messages from the go tool like '# _/compile0'
			out = commentRe.ReplaceAll(out, nil)
		}
		out = bytes.Replace(out, []byte(src+":"), []byte("main.go:"), -1)
	}()

	// write body to x.go
	body := new(bytes.Buffer)
	if _, err = body.ReadFrom(req.Body); err != nil {
		return
	}
	defer os.Remove(src)
	if err = ioutil.WriteFile(src, body.Bytes(), 0666); err != nil {
		return
	}

	// build x.go, creating x
	dir, file := filepath.Split(src)
	out, err = run(dir, "go", "build", "-o", bin, file)
	defer os.Remove(bin)
	if err != nil {
		return
	}

	// run x
	return run("", bin)
}

// error writes compile, link, or runtime errors to the HTTP connection.
// The JavaScript interface uses the 404 status code to identify the error.
func error_(w http.ResponseWriter, out []byte, err error) {
	w.WriteHeader(404)
	if out != nil {
		output.Execute(w, out)
	} else {
		output.Execute(w, err.Error())
	}
}

// run executes the specified command and returns its output and an error.
func run(dir string, args ...string) ([]byte, error) {
	var buf bytes.Buffer
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = dir
	cmd.Stdout = &buf
	cmd.Stderr = cmd.Stdout
	err := cmd.Run()
	return buf.Bytes(), err
}

// HTML output template snippet
const outputText = `<pre>{{printf "%s" . |html}}</pre>`
var output = template.Must(template.New("output").Parse(outputText))


// Default program to start out with.
const hello = `package main

import "fmt"

func main() {
	fmt.Println("hello, world")
}
`
