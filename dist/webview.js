"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenieWebView = void 0;
const vscode = require("vscode");
class CodeGenieWebView {
    static createOrShow(extensionUri) {
        if (this.currentPanel) {
            this.currentPanel.reveal(vscode.ViewColumn.Two);
            return;
        }
        this.currentPanel = vscode.window.createWebviewPanel('codeGenieAI', 'CodeGenie AI Assistant', vscode.ViewColumn.Two, { enableScripts: true });
        this.currentPanel.webview.html = this.getHtml();
        this.currentPanel.onDidDispose(() => (this.currentPanel = undefined));
    }
    static getHtml() {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>CodeGenie AI</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 10px; }
                textarea { width: 100%; height: 100px; }
                button { padding: 10px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <h2>CodeGenie AI</h2>
            <textarea id="inputText" placeholder="Enter your coding question..."></textarea>
            <button onclick="sendRequest()">Generate Code</button>
            <pre id="output"></pre>

            <script>
                async function sendRequest() {
                    const input = document.getElementById("inputText").value;
                    const output = document.getElementById("output");

                    const response = await fetch("http://localhost:8000/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt: input })
                    });

                    const data = await response.json();
                    output.innerText = data.response;
                }
            </script>
        </body>
        </html>`;
    }
}
exports.CodeGenieWebView = CodeGenieWebView;
