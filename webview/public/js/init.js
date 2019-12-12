window.$ = window.jQuery
var vscode = acquireVsCodeApi()
window.vscode = vscode 

window.$(function() {
    vscode.postMessage({cmd: 'init'})
})


window.addEventListener('message', function (event) {
    if( event.data.cmd == 'init' ) {
        init(event.data)
    }
    else if( event.data.cmd == 'invoke-return' ) {
        if(!pendingInvoke[event.data.invokeid]){
            console.error("unknow invoke id",event)
            return 
        }
        pendingInvoke[event.data.invokeid]( event.data.ret )
        delete pendingInvoke[event.data.invokeid]
    }

    else {
        window.$bus.emit(event.data.cmd, event.data)
    }
})


function init(data) {
    window.$state.usb.active = data.usb.active
    window.$state.usb.list = data.usb.list

    window.$("img").each(function(){
        var src = window.$(this).attr("src")
        if(src[0]=='/') {
            var newsrc = "vscode-resource:/" + data.root + "/" + src
            window.$(this).attr("src", newsrc) 
        }
    })

    vscode.postMessage({cmd: 'ready'})
}

var invokeId = 0 ;
var pendingInvoke = {}

window.$bus = {
    __proto__:  new window.EventEmitter() ,

    invoke: function(objName, methodName, ...argv) {
        var vid = invokeId++
        vscode.postMessage({ cmd: "invoke", object: objName, method: methodName, argv, invokeid: vid })
        return new Promise(resolve=> pendingInvoke[vid] = resolve)
    }
}

window.$state = {
    usb: {
        list: [{path:"xxx"}] ,
        active: {
            path: "" ,
            isOpen: false
        }
    } ,

    xxxx: "xxxx"
}