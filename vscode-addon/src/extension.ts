import * as vscode from 'vscode';
import { WebviewPanel } from 'vscode';
const fs = require("fs")
const path = require("path")
import { Compiler } from './compiler';



import * as Serial from 'serialport'
import { resolve } from 'dns';

const compiler = new Compiler()

// const Serial = require('serialport')
class SerialManager {

	activeDev?: Serial 

	_list = []

	open(path: string) {
		console.log("open serial",path)
		if(!panel)
			return
		if(this.activeDev){
			(this.activeDev as any).close()
		}
		this.activeDev = new Serial(path, {baudRate:115200}, (err:any)=>{
			if(err) {
				panel!.webview.postMessage({cmd: "usb-error", error: err})
			}
			else {
				panel!.webview.postMessage({cmd: "usb-open", path: path})
			}
		})
		this.activeDev.on("data", (data)=>{
			// console.log("<<",data)
			panel!.webview.postMessage({cmd: "usb-data", data})
		})
		this.activeDev.on("close", ()=>{
			delete this.activeDev
			panel!.webview.postMessage({cmd: "usb-close"})
		})
		this.activeDev.on("error", ()=>{
			panel!.webview.postMessage({cmd: "usb-error"})
		})
	}

	close() {
		this.activeDev && this.activeDev.close()
	}

	write(data: string|[]) {
		this.activeDev && this.activeDev.write(data)
	}
	
	async list() {
		this._list = (await Serial.list()) as []
		return this._list
	}


}
const serialMgr = new SerialManager()


var panel: WebviewPanel | undefined ;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.openMainUI', function () {
		
		if(!panel) {
			console.log("new pannel")
			createWebviewPanel(context)
		}
		else {
			console.log("old pannel")
			panel.reveal() ;
		}
	}))

	context.subscriptions.push(vscode.commands.registerCommand('extension.runScript', (item)=>{
		upload(item.fsPath, context, false)
	}))
	context.subscriptions.push(vscode.commands.registerCommand('extension.uploadScript', function (item) {
		upload(item.fsPath, context, true)
	}))

}

async function upload(scriptPath:string, context: vscode.ExtensionContext, save: boolean) {
	
	if(!panel) {
		console.log("new pannel")
		await createWebviewPanel(context)
	}
	
	if( !serialMgr.activeDev || !serialMgr.activeDev.isOpen ) {
		panel && panel.webview.postMessage({cmd:"echo", data: "Not connected to a device yet"})
		return
	}

	console.log(scriptPath)
	panel && panel.webview.postMessage({cmd:"echo", data: "compile script "+scriptPath+" ..."})

	var res = await compiler.compile(scriptPath)
	if(!res.suc) {
		var msg = `
compile failed: ${res.error.message}
file: ${res.error.filename}
line: ${res.error.line}, col: ${res.error.col}
${res.error.context}
`

		panel && panel.webview.postMessage({cmd:"echo", data: msg})
		return

	}
	
	var code = res.code

	if(save) {
		
		serialMgr.activeDev.write("reset()\n")
		await sleep(1000)

		code+= "; save();"
	}
	code+="\n"

	panel && panel.webview.postMessage({cmd:"echo", data: "writing script to WiFi part ... ..."})

	if( await usbWrite(serialMgr.activeDev, code) ){

		panel && panel.webview.postMessage({cmd:"echo", data: "Write done"})
		
	}
}


function _usbWriteChunk(dev: Serial, chunk: any) {
	return new Promise(resolve=>{
		dev.write(chunk, (err)=>{
			if(err) console.log("err:", err)
			resolve(!err)
		})
	})
}
const CHUNKLEN = 64
async function usbWrite(dev: Serial, data: any) {
	console.log("total script length>>",data.length)
	while( data.length ) {
		var chunklen = (data.length>CHUNKLEN)? CHUNKLEN: data.length
		var chunk = data.substr(0, chunklen)

		console.log("chunk>>",chunklen)

		if(! await _usbWriteChunk(dev, chunk)) {
			return false
		}

		data = data.substr(chunklen)

		await sleep(10)
	}
	return true
}


function sleep(ms:number) {
	return new Promise(resolve=>setTimeout(resolve, ms))
}

var bindObjects: {[key:string]:any} = {
	serial: serialMgr
}

function createWebviewPanel (context: vscode.ExtensionContext) {
	return new Promise((resolve:any)=>{

		panel = vscode.window.createWebviewPanel(
			'becoder',
			"Be a coder? cool!",
			vscode.ViewColumn.Beside,
			{
				enableScripts: true, // 启用JS，默认禁用
				retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
			}
		);
		let html = getWebViewContent(context, "dist/webview/index.html")
		panel.webview.html = html

		
		panel.webview.onDidReceiveMessage(message => {
			if(message.cmd=='init') {
				panel && panel.webview.postMessage({
					cmd:"init", 
					root: context.extensionPath+"/dist/webview" ,
					usb: {
						list: serialMgr._list ,
						active: {
							path: serialMgr.activeDev && serialMgr.activeDev.path ,
							isOpen: !!(serialMgr.activeDev && serialMgr.activeDev.isOpen)
						}
					}
				})
			}

			else if(message.cmd=="ready") {
				resolve(panel)
			}
	
			else if(message.cmd=='invoke') {
				var ret = bindObjects[ message.object ][ message.method ] (...(message.argv||[]))
				if( ret instanceof Promise) {
					ret.then((ret: any)=>{
						panel && panel.webview.postMessage({cmd:"invoke-return", invokeid: message.invokeid, ret})
					})
				}
				else {
					panel && panel.webview.postMessage({cmd:"invoke-return", invokeid: message.invokeid, ret})
				}
			}
	
		}, undefined, context.subscriptions);
	
	
		panel.onDidDispose(
			() => {
				panel = undefined;
			},
			null,
			context.subscriptions
		)
	})
}

function getExtensionFileVscodeResource (context: vscode.ExtensionContext, relativePath:string) {
	const diskPath = vscode.Uri.file(path.join(context.extensionPath, relativePath));
	return diskPath.with({ scheme: 'vscode-resource' }).toString();
}

function getWebViewContent(context:vscode.ExtensionContext, templatePath:string) {
	const resourcePath = path.join(context.extensionPath, templatePath);
	const dirPath = path.dirname(resourcePath);
	let html = fs.readFileSync(resourcePath, 'utf-8');
	// vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
	html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m:any, $1:any, $2:any) => {
		if($2[0]=="/")
			return $1 + "vscode-resource:" + dirPath + "/" + $2 + '"'
		else
			return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
	});
	return html;
}

export function deactivate() {}
