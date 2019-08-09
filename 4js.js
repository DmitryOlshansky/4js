'use strict';
let dictionary = {}
// word: String, code: (task) -> Void
// word: String, code: string of JS code to inject during compilation (for lack of machine code)
function define(word, code) {
    dictionary[word] = code
}

// return index to first element in 'inp' that doesn't pass the 'check' starting with 'i' or length of input
// (utility function)
function skipWhile(inp, i, check) {
    while(i < inp.length && check(inp[i])) i++
    return i
}

// primitive ASCII whitespace check
function isWhite(c) { return ' \t\v\r\n'.indexOf(c) >= 0 }

// create an executable 4JS context
// memory: 
// stack_size: 
// input: initial string of input buffer
function forth(stack_size, heap_size) {
    return {
        stack_size: stack_size,                 //
        sp: 0,                                  // grows up (unlike many impls)
        rp: stack_size-1,                       // grows down, once sp == rp -> overflow or underflow depending on which of sp or rp was changed
        heap: stack_size,                       // grows up
        mem: new Array(stack_size + heap_size), // memory array
        tib: "",                                // aka terminal input buffer
        tidx: 0,                                // index of current position in tib (for lack of pointers)
        // "machine-coded" helpers
        exec: function(word) {
            dictionary[word](this)
        },
        push: function(item){
            if (this.sp > this.rp) this.abort("Stack overflow")
            this.mem[this.sp++] = item
        },
        pop: function() {
            if (this.sp <= 0) this.abort("Stack underflow")
            return this.mem[--this.sp]
        },
        top: function() {
            if (this.sp == 0) this.abort("Stack underflow")
            return this.mem[this.sp-1]
        },
        dup: function() { 
            this.push(this.top())
        },
        swap: function() {
            if (this.sp < 2) this.abort("Stack underflow")
            let t = this.mem[this.sp-2]
            this.mem[this.sp-2] = this.mem[this.sp-1]
            this.mem[this.sp-1] = t
        },
        clear_stacks: function(){
            this.sp = 0
            this.rp = stack_size-1
        },
        // try to parse str as number or quoted string
        valueOf: function (str) {
            let value = parseFloat(str)
            if (!isNaN(value)) return value;
            else this.abort("Unrecognized word: "+str)
        },
        abort: function(msg){
            this.clear_stacks()
            throw msg ? msg : "Aborted";
        },
        // ( -- word-from-tib)
        word: function () {
            let start = skipWhile(this.tib, this.tidx, isWhite)
            let end = skipWhile(this.tib, start, c => !isWhite(c))
            this.tidx = end
            this.push(this.tib.slice(start, end))
        },
        // ( addr -- value )
        at: function() {                // Forth's @ word
            this.push(this.mem[this.pop()])
        },
        // ( value addr )
        bang: function() {              // Forth's ! word
            let addr = this.pop()
            let value = this.pop()
            if (addr >= this.mem.length || addr < 0) this.abort("Bad memory location")
            this.mem[addr] =  value
        },
        // ( -- starts-compilation )    // Forth's : word
        compile: function() {
            let source = ""
            this.word()
            let w = this.pop()
            if (w == "") this.abort("Unterminated compilation")
            for (;;) {
                this.word()
                let p = this.pop()
                if (p == ";") break
                else if(p == ":") this.abort("word ':' has no meaning in compilation")
                let code = dictionary[p]
                if (!code) {
                    this.valueOf(p) // checks validity of value
                    source += "task.push("+p+");"
                }
                else if (typeof(code) == "string") // direct "machine code"
                    source += code
                else
                    source += "task.exec('"+p.replace("'", "\\'")+"'); "
            }
            try {
                define(w, eval("(task) => { " + source + "}"))
            }
            catch (e) {
                console.error(source)
                this.abort("Failed to compile (possibly incorrect use of control-flow words such as IF, ELSE, THEN, DO, LOOP etc.) " + e)
            }
        },
        execute: function(w) {
            let code = dictionary[w]
            if (!code)
                this.push(this.valueOf(w))
            else if (typeof(code) == "string")
                this.abort("Compile-time only word "+w)
            else 
                code(this)
        },
        interpret: function() {
            for  (;;) {
                this.word()
                let w = this.pop()
                if (w == "") break
                this.execute(w)
            }
        },
        run: function(input) {
            this.tib = input
            this.tidx = 0
            this.interpret()
        }
    }
}
// ============= CORE =====================
define("SP", (task) => task.push(task.sp))
define("RP", (task) => task.push(task.rp))
define(".", (task) => console.log(task.pop()))
define("DUP", (task) => task.dup())
define("DROP", (task) => task.pop())
define("SWAP", (task) => task.swap())
define(":", (task) => task.compile())
define("'", (task) => task.word())
define("EXECUTE", (task) => task.execute(task.pop()))
// ============= CONTROL-FLOW =============
define("IF", "if (task.pop()) {")
define("ELSE", "} else { ")
define("THEN", "}")
define("DO", "{ let i = task.rp--; if (task.rp < task.sp) task.abort('Stack underflow'); task.mem[i] = task.pop(); let limit = task.pop(); for (;;) { ")
define("LOOP", " if (++task.mem[i] >= limit) break; } }")
// =========== OPERATORS ==================
define("=", (task) => task.push(task.pop() == task.pop()))
define("+", (task) => {
    let b = task.pop()
    let a = task.pop()
    task.push(a + b)
})
define("-", (task) => { 
    let b = task.pop() 
    let a = task.pop()
    task.push(a - b)
})
// ========================================
// 4 stack size is enough for simple tests:
// 2 for stack values + 1 for interpreter + 1 for ret stack
let t = forth(4, 8)
t.run("1 2 + .")
t.run(": 0= 0 = ; : DUP? DUP 0= IF DROP THEN ; 1 DUP? 0 DUP? .")
t.run(": NULLS 0 DO 0 . LOOP ; 7 NULLS")
