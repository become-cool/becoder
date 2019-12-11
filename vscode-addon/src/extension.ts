import * as vscode from 'vscode';
import { WebviewPanel } from 'vscode';
const fs = require("fs")
const path = require("path")

import * as Serial from 'serialport'

// const Serial = require('serialport')
class SerialManager {

	activeDev?: Serial 

	open(path: string) {
		console.log("open usb",path)
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
		this.activeDev!.close()
	}

	write(data: string|[]) {
		this.activeDev!.write(data)
	}
	
	list() {
		return Serial.list()
	}


}
const serialMgr = new SerialManager()


var panel: WebviewPanel | undefined ;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.openMainUI', function () {
		
		if(!panel) {
			console.log("new pannel")
			panel = createWebviewPanel(context)
		}
		else {
			console.log("old pannel")
			panel.reveal() ;
		}
	}))
}


var bindObjects: {[key:string]:any} = {
	serial: serialMgr
}

function createWebviewPanel (context: vscode.ExtensionContext): WebviewPanel {
	panel = vscode.window.createWebviewPanel(
		'testWebview', // viewType
		"WebView演示", // 视图标题
		vscode.ViewColumn.One, // 显示在编辑器的哪个部位
		{
			enableScripts: true, // 启用JS，默认禁用
			retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
		}
	);
	let html = getWebViewContent(context, "dist/webview/index.html")
	panel.webview.html = html
	
	panel.webview.onDidReceiveMessage(message => {
		if(message.cmd=='ready') {
			panel && panel.webview.postMessage({
				cmd:"init", 
				root: context.extensionPath+"/dist/webview" ,
				usb: {
					path: serialMgr.activeDev!.path ,
					isOpen: !!(serialMgr.activeDev!.isOpen)
				}
			})
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
	return panel
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
