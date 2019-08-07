let dictionary = {}
let stack = []

// === CORE ===
dictionary["."] = () =>  { 
    console.log(stack.pop()) 
}
dictionary["DUP"] = () => { stack.push(stack[stack.length-1]) }
dictionary["SWAP"] = () => { 
    let a = stack[stack.length-1]
    stack[stack.length-1] = stack[stack.length-2]
    stack[stack.length-2] = a
}
dictionary["+"] = () => { stack.push(stack.pop() + stack.pop()) }
dictionary["-"] = () => { 
    let b = stack.pop(); let a = stack.pop()
    stack.push(a - b)
}
// ============

function evalForth(text) {
    let words = text.split(/\s+/)
    let i = 0
    let toBeDefined = ''
    let body = ''
    let compile = false
    while (i < words.length) {
        console.log(stack)
        if (words[i] == ":") {
            compile = true
            i++
            if (i == words.length) throw "No definition provided after ':'"
            toBeDefined = words[i]
        }
        else if(words[i] == ";"){
            compile = false
            console.log("Compiled " + toBeDefined +": " + body)
            dictionary[toBeDefined] = eval('() => {' + body + "}")
            body = ''
        }
        else if(words[i] == "(") {
            i = skipUntil(words, i + 1, ")")
        }
        else if (words[i] in dictionary) {
            // compilation mode
            if (compile) body += "dictionary['"+words[i]+"']();"
            // immediate mode
            else dictionary[words[i]]() 
        }
        else if (
            words[i].length >= 2 &&
            (
                (words[i].startsWith("'") && words[i].endsWith("'")) ||
                (words[i].startsWith('"') && words[i].endsWith('"'))
            )
        ) {
            let value = words[i].slice(1, words[i].length-1)
            // TODO: redo escaping if needed
            if (compile) body += "stack.push('"+value+"');"
            // TODO: unescape
            else stack.push(value)
        }
        else {
            let value = parseFloat(words[i])
            if (!isNaN(value)) {
                if (compile) body += "stack.push("+value+");"
                else stack.push(value)
            }
            else 
                throw "Unrecognized word "+words[i]
        }
        i++
    }

}

function skipUntil(words, i, word) {
    while(i < words.length && words[i] != word) i++
    if (i == words.length) throw "Expected terminating '"+word+"' in the input"
    return i
}
