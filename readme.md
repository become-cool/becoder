

编译 web view ui
```
cd webview
npm run-script build
```

编译 vscode extention
```
cd vscode-addon
tsc -watch -p ./
```

打包 
```
vsce package
vsce publish
```

vscode市场创建账号流程：
https://www.cnblogs.com/liuxianan/p/vscode-plugin-publish.html