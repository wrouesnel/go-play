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
//    --html  render program output in compile handler (default true)
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
	"log"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"text/template"
)

/************** FIXME: put in a separate file ****************/

// Format handler
import (
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
    "golang.org/x/net/websocket"
)

type fmtResponse struct {
	Body  string
	Error string
}

var tmpdir string

// FmtHandler handles a Go-source format request. The go source code
// is given in req and the formated output is passed back in w.  Errors
// are wrapped in <pre> tags and returned in re.
// This routine must be called via an HTTP POST request.
func FmtHandler(w http.ResponseWriter, req *http.Request) {
	resp := new(fmtResponse)
	if req.Method != "POST" {
		http.Error(w, "Forbidden, need POST", http.StatusForbidden)
		return
	}
	body, err := gofmt(req.FormValue("body"))
	if err != nil {
		resp.Error =
			fmt.Sprintf("<pre><a href=\"/error\">%s</a></pre>",
			err.Error())
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

/*********************************************************************************/
// Ajax POST version of compile+run

type compileResponse struct {
	Body  string
	Stdout string
	Stderr string
	Error  string
}

// CompileHandler is an HTTP handler that reads Go source code from req,
// runs the program (returning any errors),
// and sends the program's output as the HTTP response to w.
func CompileHandler(w http.ResponseWriter, req *http.Request) {
	resp := new(compileResponse)
	if req.Method != "POST" {
		http.Error(w, "Forbidden, need POST", http.StatusForbidden)
		return
	}
	var stderr, stdout []byte
	var err error
	runEnv  := strings.Split(req.FormValue("RunEnv"), " ")
	runOpts := req.FormValue("RunOpts")
	srcDir  := req.FormValue("SrcDir")
	goTest  := req.FormValue("GoTest")

	if ("true" == goTest) {
		stdout, stderr, err = runTestViaPost(srcDir, runOpts, runEnv)
	} else {
		stdout, stderr, err =
			compile(req.FormValue("Body"), req.FormValue("BuildOpts"), runOpts, runEnv)
	}
	resp.Stdout = string(stdout)
	resp.Stderr = string(stderr)
	if err != nil {
		resp.Error  = string(err.Error())
		fmt.Printf("error is %s\n", resp.Error)
	}
	/* fmt.Printf("stdout is %s\n", resp.Stdout)
	fmt.Printf("stderr is %s\n", resp.Stderr) */
	json.NewEncoder(w).Encode(resp)
}

func compile(body string, buildOpts string, runOpts string, runEnv []string) (stdout []byte, stderr []byte, err error) {
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
			stderr = commentRe.ReplaceAll(stderr, nil)
		}
		stdout = bytes.Replace(stdout, []byte(src+":"), []byte("main.go:"), -1)
	}()

	// write body to x.go
	defer os.Remove(src)
	if err = ioutil.WriteFile(src, []byte(body), 0666); err != nil {
		return
	}

	// build x.go, creating x
	dir, file := filepath.Split(src)
	buildArgs := []string{"go", "build", "-o", bin}
	if len(buildOpts) != 0 {
		buildArgs = append(buildArgs, strings.Split(buildOpts, " ")...)
	}
	buildArgs = append(buildArgs, file)
	stdout, stderr, err = run(dir, nil, buildArgs)
	defer os.Remove(bin)
	if err != nil {
		/* fmt.Printf("+++ stdout is %s\n", stdout)
		fmt.Printf("+++ stderr is %s\n", stderr) */
		if (len(stderr) == 0 && len(stdout) != 0) {
			stderr = stdout
			stdout = []byte("")
		}
		return
	}

	// run x
	var runStdout, runStderr [] byte
	runArgs := []string{bin}
	if len(runOpts) != 0 {
		runArgs = append(runArgs, strings.Split(runOpts, " ")...)
	}
	runStdout, runStderr, err = run("", runEnv, runArgs)
	stdout = append(stdout, runStdout...)
	stderr = append(stderr, runStderr...)
	return
}

func runTestViaPost(dir string, runOpts string, runEnv []string) (stdout []byte, stderr []byte, err error) {

	// run x
	var runStdout, runStderr [] byte
	runArgs := []string{"go", "test"}
	if len(runOpts) != 0 {
		runArgs = append(runArgs, strings.Split(runOpts, " ")...)
	}
	runStdout, runStderr, err = run(dir, runEnv, runArgs)
	stdout = append(stdout, runStdout...)
	stderr = append(stderr, runStderr...)
	return
}

// run executes the specified command and returns its output and an error.
func run(dir string, env []string, args []string) ([]byte, []byte, error) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = dir
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if env != nil && len(env) != 0 {
		cmd.Env = env
	}
	s := fmt.Sprintf("GOPATH=%s", os.Getenv("GOPATH"))
	cmd.Env = append(cmd.Env, s)
	s = fmt.Sprintf("GOROOT=%s", os.Getenv("GOROOT"))
	cmd.Env = append(cmd.Env, s)
	// fmt.Println("++++ env is", cmd.Env)
	// fmt.Println(cmd)
	err := cmd.Run()
	return stdout.Bytes(), stderr.Bytes(), err
}

/*********************************************************************************/
// Now compile+run via websockets


// Environ, if non-nil, is used to provide an environment to go command and
// user binary invocations.
var Environ func() []string

const msgLimit = 1000 // max number of messages to send per session

// Message is the wire format for the websocket connection to the browser.
// It is used for both sending output messages and receiving commands, as
// distinguished by the Kind field.
type Message struct {
	Id        string // client-provided unique id for the process
	Kind      string // in: "run", "kill" out: "stdout", "stderr", "end"
	BuildOpts string // flags to pass to "go build"
	RunOpts   string // flags to pass to "invocation"
	Body      string
	GoTest    bool   // Run "go test" instead of "go run"?
	SrcDir    string // Source Directory in run. Needs to be set for "go test"
}

func init() {
	// find real path to temporary directory
	var err error
	tmpdir, err = filepath.EvalSymlinks(os.TempDir())
	if err != nil {
		log.Fatal(err)
	}
}

var uniq = make(chan int) // a source of numbers for naming temporary files

func init() {
	go func() {
		for i := 0; ; i++ {
			uniq <- i
		}
	}()
}

// WSCompileRunHandler handles the websocket connection for a given compile/run action.
// It handles transcoding Messages to and from JSON format, and handles starting
// and killing processes.
func WSCompileRunHandler(c *websocket.Conn) {
	c.Config()
	in, out := make(chan *Message), make(chan *Message)
	errc := make(chan error, 1)

    // Decode messages from client and send to the in channel.
    go func() {
        dec := json.NewDecoder(c)
        for {
            var m Message
            if err := dec.Decode(&m); err != nil {
				fmt.Printf("error in dec.Decode %s\n", err);
                errc <- err
                return
            }
            in <- &m
        }
    }()

    // Receive messages from the out channel and encode to the client.
    go func() {
        enc := json.NewEncoder(c)
        for m := range out {
            if err := enc.Encode(m); err != nil {
				fmt.Printf("error in enc.Encode %s\n", err);
                errc <- err
                return
            }
        }
    }()

   // Start and kill Processes and handle errors.
    proc := make(map[string]*Process)
    for {
        select {
        case m := <-in:
            switch m.Kind {
            case "run":
				goTest := m.GoTest
                proc[m.Id].Kill()
				if goTest {
					proc[m.Id] = StartTest(m.Id, m.SrcDir, m.RunOpts, nil, out)
				} else {
					proc[m.Id] = StartProcess(m.Id, m.Body, m.BuildOpts, m.RunOpts, nil, out)
				}
            case "kill":
                proc[m.Id].Kill()
            }
        case err := <-errc:
            // A encode or decode has failed; bail.
            log.Println(err)
            // Shut down any running processes.
            for _, p := range proc {
                p.Kill()
            }
            return
        }
    }
}

// Process represents a running process.
type Process struct {
    id   string
    out  chan<- *Message
    done chan struct{} // closed when wait completes
    run  *exec.Cmd
}

// StartProcess builds and runs the given program, sending its output
// and end event as Messages on the provided channel.
func StartProcess(id, body string, buildOpts string, runOpts string, runEnv []string,
	out chan<- *Message) *Process {
    p := &Process{
        id:   id,
        out:  out,
        done: make(chan struct{}),
    }
    if err := p.start(body, buildOpts, runOpts, runEnv); err != nil {
        p.end(err)
        return nil
    }
    go p.wait()
    return p
}

// StartProcess builds and runs the given program, sending its output
// and end event as Messages on the provided channel.
func StartTest(id, dir string, runOpts string, runEnv []string,
	out chan<- *Message) *Process {
    p := &Process{
        id:   id,
        out:  out,
        done: make(chan struct{}),
    }
    if err := p.test(dir, runOpts, runEnv); err != nil {
        p.end(err)
        return nil
    }
    go p.wait()
    return p
}

// Kill stops the process if it is running and waits for it to exit.
func (p *Process) Kill() {
    if p == nil {
        return
    }
    p.run.Process.Kill()
    <-p.done
}

// start builds and starts the given program, sends its output to p.out,
// and stores the running *exec.Cmd in the run field.
func (p *Process) start(body string, buildOpts string,
	                    runOpts string, runEnv []string) error {
	// We "go build" and then exec the binary so that the
	// resultant *exec.Cmd is a handle to the user's program
	// (rather than the go tool process).
	// This makes Kill work.

    // x is the base name for .go and executable files
    x := filepath.Join(tmpdir, "compile"+strconv.Itoa(<-uniq))
    src := x + ".go"
    bin := x
    if runtime.GOOS == "windows" {
        bin += ".exe"
    }

    // write body to x.go
    defer os.Remove(src)
    if err := ioutil.WriteFile(src, []byte(body), 0666); err != nil {
        return err
    }

    // build x.go, creating x
    defer os.Remove(bin)
    dir, file := filepath.Split(src)
    var cmd  *exec.Cmd
	buildArgs := []string{"go", "build", "-o", bin}
	if len(buildOpts) != 0 {
		buildArgs = append(buildArgs, strings.Split(buildOpts, " ")...)
	}
	buildArgs = append(buildArgs, file)
	cmd = p.cmd(dir, nil, buildArgs...)
	// fmt.Println("++cmd", cmd);
	cmd.Stdout = cmd.Stderr // send compiler output to stderr
    if err := cmd.Run(); err != nil {
        return err
    }

    // run x
	runArgs := []string{bin}
	if len(runOpts) != 0 {
		runArgs = append(runArgs, strings.Split(runOpts, " ")...)
	}
    cmd = p.cmd("", runEnv, runArgs...)
    if err := cmd.Start(); err != nil {
        return err
    }

    p.run = cmd
    return nil
}

// Run go test on given directory, sends its output to p.out,
// and stores the running *exec.Cmd in the run field.
func (p *Process) test(dir string, runOpts string, runEnv []string) error {
    // run go test
	runArgs := []string{"go", "test"}
	if len(runOpts) != 0 {
		runArgs = append(runArgs, strings.Split(runOpts, " ")...)
	}
    cmd := p.cmd(dir, runEnv, runArgs...)
    if err := cmd.Start(); err != nil {
        return err
    }

    p.run = cmd
    return nil
}

// wait waits for the running process to complete
// and sends its error state to the client.
func (p *Process) wait() {
    p.end(p.run.Wait())
	close(p.done) // unblock waiting Kill calls
}

// end sends an "end" message to the client, containing the process id and the
// given error value.
func (p *Process) end(err error) {
    m := &Message{Id: p.id, Kind: "end"}
    if err != nil {
        m.Body = err.Error()
    }
    p.out <- m
}

// cmd builds an *exec.Cmd that writes its standard output and error to the
// Process' output channel.
func (p *Process) cmd(dir string, env []string, args ...string) *exec.Cmd {
    cmd := exec.Command(args[0], args[1:]...)
    cmd.Dir = dir
	if env != nil && len(env) != 0 {
		cmd.Env = env
	} else if Environ != nil {
		cmd.Env = Environ()
	}

	// FIXME: we should merge what is in ENV
	s := fmt.Sprintf("GOPATH=%s", os.Getenv("GOPATH"))
	cmd.Env = append(cmd.Env, s)
	s = fmt.Sprintf("GOROOT=%s", os.Getenv("GOROOT"))
	cmd.Env = append(cmd.Env, s)

    cmd.Stdout = &messageWriter{p.id, "stdout", p.out}
    cmd.Stderr = &messageWriter{p.id, "stderr", p.out}
    return cmd
}

// messageWriter is an io.Writer that converts all writes to Message sends on
// the out channel with the specified id and kind.
type messageWriter struct {
    id, kind string
    out      chan<- *Message
}

func (w *messageWriter) Write(b []byte) (n int, err error) {
    w.out <- &Message{Id: w.id, Kind: w.kind, Body: string(b)}
    return len(b), nil
}

/*********************************************************************************/

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
		// fmt.Printf("Save Error: %s\n", err.Error())
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

func main() {
	goplayHtml, _ := assetFS().Asset("data/goplay.html")
	editTemplate.Parse(string(goplayHtml))
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
	http.HandleFunc("/compile",   CompileHandler)
	http.HandleFunc("/fmt",       FmtHandler)
	http.HandleFunc("/save",      SaveHandler)
	http.HandleFunc("/share",     ShareHandler)
	http.HandleFunc("/save/",     SaveHandler)
	http.Handle("/wscompile", websocket.Handler(WSCompileRunHandler))

	http.Handle("/static/", http.FileServer(assetFS()))
	fmt.Printf("Runnning Go Play. Attempting to listening on %s\n",
		*httpListen)
	
	log.Fatal(http.ListenAndServe(*httpListen, nil))
}


// Default program to start out with.
const hello = `package main

import "fmt"

func main() {
	fmt.Println("hello, world")
}
`
var editTemplate = template.New("goplay.html")

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
