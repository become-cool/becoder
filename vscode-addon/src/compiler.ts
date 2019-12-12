const fs = require("fs")
const child_process = require("child_process")
const UglifyJS = require("uglify-js");
const regenerator = require("regenerator");

const runtimecode = `
var regeneratorRuntime = {
    async: function(func) {
        return new Promise(function (resolve){
            var _context = {
                abrupt: function(r, v) {
                    this.pending = false
                    this.retval = v
                } ,
                stop: function() {
                    this.pending = false
                } ,
                prev: -1 , next: 0 ,
                pending: true ,
                sent: undefined ,
                retval: undefined
            }
            _context["catch"] = function() {}
            function step() {
                var res = func(_context)
                if(!_context.pending) {
                    resolve(_context.retval)
                    return
                }
    
                else {
                    res.then(function(sent){
                        _context.sent = sent
                        step()
                    })
                }
            }
            step()
        })
    } ,
    awrap: function(promise) {
        return promise
    }
}
`


export class Compiler {
    async compile(scriptPath: string) {

        var source = fs.readFileSync(scriptPath)
        var res = regenerator.compile(source)

        var code = runtimecode + res.code 
        
        var tmpFile1 = scriptPath+".~~tmp1"
        fs.writeFileSync(tmpFile1, code)
        
        var src: {[key:string]:string} = {}
        src[scriptPath] = code

        var igly = UglifyJS.minify(src, {
            mangle: {
                toplevel: false,
            },
            output: {
                beautify: false
            }
        })

        if(igly.error) {
            console.error("error for UglifyJS.minify()")
            console.error(igly)

            var context = splitLines(code, igly.error.line)
            igly.error.context = context.join("\n")

            return {
                error: igly.error ,
                suc: false
            }
        }

        console.log(igly)
        code = igly.code
        
        var tmpFile2 = scriptPath+".~~tmp2"
        fs.writeFileSync(tmpFile2, code)
        
        return {
            suc: true ,
            code
        }
    }
}

function splitLines(source:string, atLine:number) {
    var start = atLine - 5
    var end = atLine + 6
    if(start<0) start = 0
    var lines = (source||"").split(/\n/gm)
    var context = lines.slice(start, atLine).reduce((arr: string[], l:string)=>{
        arr.push("  "+l)
        return arr
    },[])
    
    context.push("> " + lines[atLine])

    return context.concat( lines.slice(atLine+1, end).reduce((arr: string[], l:string)=>{
        arr.push("  "+l)
        return arr
    },[]) )
}
 
// if(process.argv.length<4 ) {
//     console.log("node compiler <source.js> <compiled.js>")
//     process.exit()
// }

// var sourceFile = process.argv[2]
// var compiledFile = process.argv[3]
// var tmpFile1 = "_tmp1.......js"
// var tmpFile2 = "_tmp2.......js"
// var awaiterLibCode = fs.readFileSync("awaiter.js").toString()
// const startTag = `function _________start_tag_________() { }\n`

// var code = fs.readFileSync(sourceFile).toString()
// code = startTag + code
// fs.writeFileSync(tmpFile1, code)


// // console.log(
//     child_process.execFileSync("tsc", [tmpFile1,"--allowJs","--outFile", tmpFile2])
// // )


// code = fs.readFileSync(tmpFile2).toString()
// // console.log(code.split(startTag))

// code = awaiterLibCode + code.split(startTag)[1]


// var src = {}
// src[sourceFile] = code
// var igly = UglifyJS.minify(src, {
//     mangle: {
//         toplevel: false,
//     },
//     output: {
//         beautify: false
//     }
// })

// if(igly.error) {
//     console.error("error for UglifyJS.minify()")
//     console.error(igly.error)
//     process.exit()
// }

// code = igly.code


// /*
// if(void 0==x) var x =xxxx
// to :
// if(typeof(x)=='undefined') var x =xxxx
// */
// code = code.replace(/\(void 0 ?=== ?([^\)]+)\)/, "(typeof($1)=='undefined')")


// fs.writeFileSync(compiledFile,code)

// fs.unlinkSync(tmpFile1)
// fs.unlinkSync(tmpFile2)


