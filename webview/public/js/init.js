window.$ = jQuery
window.vscode = acquireVsCodeApi()

$(function() {
    vscode.postMessage({cmd: 'ready'})
})


window.addEventListener('message', event => {
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
        $bus.emit(event.data.cmd, event.data)
    }
})


function init(data) {
    $("img").each(function(){
        var src = $(this).attr("src")
        if(src[0]=='/') {
            var newsrc = "vscode-resource:/" + data.root + "/" + src
            $(this).attr("src", newsrc) 
        }
    })
}

var invokeId = 0 ;
var pendingInvoke = {}

window.$bus = {
    __proto__:  new EventEmitter() ,

    invoke(objName, methodName, ...argv) {
        var vid = invokeId++
        vscode.postMessage({ cmd: "invoke", object: objName, method: methodName, argv, invokeid: vid })
        return new Promise(resolve=> pendingInvoke[vid] = resolve)
    }
}

window.$state = {
    usb: {
        list: [] ,
        active: {
            path: "" ,
            isOpen: false
        }
    }
}