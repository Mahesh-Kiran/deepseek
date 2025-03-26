import * as vscode from 'vscode';
import axios from "axios";

let EXTENSION_STATUS = true; // Autocomplete enabled by default
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log("✅ CodeGenie Extension Activated!");

    // Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    updateStatusBar();
    statusBarItem.show();

    // Command: Generate Code from Prompt (Manual Input)
    let generateCode = vscode.commands.registerCommand('codegenie.getCode', async () => {
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("❌ Autocomplete is disabled. Enable it from the command palette.");
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('❌ Open a file to use CodeGenie.');
            return;
        }

        // 🔵 Ask for user input as prompt
        const prompt = await vscode.window.showInputBox({ prompt: 'Enter your AI prompt' });
        if (!prompt) return;

        await generateCodeFromPrompt(editor, prompt);
    });

    // Command: Auto-detect Comment and Generate Code
    let generateFromComment = vscode.commands.registerCommand('codegenie.generateFromComment', async () => {
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("❌ Autocomplete is disabled. Enable it from the command palette.");
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('❌ Open a file to use CodeGenie.');
            return;
        }

        // 🔵 Extract the most recent comment as the AI prompt
        const document = editor.document;
        const lastComment = findLastComment(document);
        if (!lastComment) {
            vscode.window.showErrorMessage("❌ No comment found to use as a prompt.");
            return;
        }

        await generateCodeFromPrompt(editor, lastComment);
    });

    // Enable/Disable Autocomplete Commands
    let enableAutocomplete = vscode.commands.registerCommand('codegenie.enableAutocomplete', () => {
        EXTENSION_STATUS = true;
        vscode.window.showInformationMessage("✅ CodeGenie Autocomplete Enabled");
        updateStatusBar();
    });

    let disableAutocomplete = vscode.commands.registerCommand('codegenie.disableAutocomplete', () => {
        EXTENSION_STATUS = false;
        vscode.window.showWarningMessage("🛑 CodeGenie Autocomplete Disabled");
        statusBarItem.text = "$(x) CodeGenie: Disabled";
    });

    context.subscriptions.push(generateCode, generateFromComment, enableAutocomplete, disableAutocomplete);
    
    // Register Inline Autocomplete Provider
    const provider: vscode.InlineCompletionItemProvider = {
        provideInlineCompletionItems: async (document, position) => {
            if (!EXTENSION_STATUS) return [];
    
            const textBeforeCursor = document.getText(new vscode.Range(position.with(undefined, 0), position));
            if (textBeforeCursor.trim().length === 0) return [];
    
            try {
                console.log("🔵 Fetching AI autocomplete for:", textBeforeCursor);
                statusBarItem.text = "$(sync~spin) CodeGenie: Generating...";
    
                let aiResponse = await fetchAICompletion(textBeforeCursor);
                if (!aiResponse || aiResponse.trim() === "") {
                    console.log("⚠ No response from AI.");
                    statusBarItem.text = "$(alert) CodeGenie: No response";
                    return [];
                }
    
                console.log("✅ AI Response:", aiResponse);
                statusBarItem.text = "$(check) CodeGenie: Ready";
    
                // Insert only code without explanations
                return [
                    new vscode.InlineCompletionItem(
                        new vscode.SnippetString(aiResponse),
                        new vscode.Range(position, position)
                    )
                ];
    
            } catch (error) {
                console.error("❌ Autocomplete Error:", error);
                statusBarItem.text = "$(error) CodeGenie: Error";
                return [];
            }
        }
    };
    

    // Register the inline autocomplete provider for all file types
    vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" }, provider);
}

// Function to Generate Code from Any Prompt
async function generateCodeFromPrompt(editor: vscode.TextEditor, prompt: string) {
    vscode.window.showInformationMessage(`✨ Generating code for: "${prompt}"`);
    statusBarItem.text = "$(sync~spin) CodeGenie: Generating...";

    try {
        let aiResponse = await fetchAICompletion(prompt);
        if (!aiResponse || aiResponse.trim() === "") {
            vscode.window.showErrorMessage("❌ No response received from AI.");
            statusBarItem.text = "$(alert) CodeGenie: No response";
            return;
        }

        // ✅ Insert only the required code into the editor
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, `\n${aiResponse.trim()}\n`);
        });

        vscode.window.showInformationMessage("✅ Code inserted successfully!");
        updateStatusBar();

    } catch (error) {
        vscode.window.showErrorMessage("❌ Error generating code.");
        statusBarItem.text = "$(error) CodeGenie: Error";
    }
}

// Function to Find the Most Recent Comment in the Document
function findLastComment(document: vscode.TextDocument): string | null {
    const totalLines = document.lineCount;

    for (let i = totalLines - 1; i >= 0; i--) {
        const lineText = document.lineAt(i).text.trim();
        if (lineText.startsWith("//") || lineText.startsWith("#")) {  // Detects both // (JS) and # (Python) comments
            return lineText.replace(/^[/#]+/, "").trim(); // Remove comment symbols
        }
    }
    return null; // No comment found
}

// Function to Fetch AI Completion from Backend (Extract Only Code)
async function fetchAICompletion(prompt: string): Promise<string> {
    try {
        console.log("🔵 Sending API request to CodeGenie...");
        const response = await axios.post("http://127.0.0.1:8000/generate", {
            prompt,
            max_tokens: 500
        });

        console.log("✅ API Response:", response.data);

        let aiResponse = response.data.response || "";

        // Remove explanations and keep only code
        aiResponse = extractOnlyCode(aiResponse);

        return aiResponse;
    } catch (error) {
        console.error("❌ Error fetching AI completion:", error);
        return "";
    }
}


function extractOnlyCode(response: string): string {
    // Split the response into lines
    let lines = response.split("\n");

    // Filter out comment lines and empty lines
    let codeLines = lines.filter(line => {
        return !(
            line.trim().startsWith("#") || // Python comments
            line.trim().startsWith("//") || // JS/Java/C++ comments
            line.trim().startsWith("/*") || // Multi-line comments
            line.trim().startsWith("*") || // JSDoc-style comments
            line.trim().startsWith("'''") || line.trim().startsWith('"""') || // Python docstrings
            line.trim() === "" // Remove empty lines
        );
    });

    // Join the remaining lines and return only the code
    return codeLines.join("\n").trim();
}


// Function to Update Status Bar
function updateStatusBar() {
    if (EXTENSION_STATUS) {
        statusBarItem.text = "$(check) CodeGenie: Ready";
    } else {
        statusBarItem.text = "$(x) CodeGenie: Disabled";
    }
}

// Deactivation Cleanup
export function deactivate() {
    console.log("🛑 CodeGenie Extension Deactivated");
    statusBarItem.dispose();
}
