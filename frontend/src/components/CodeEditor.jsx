import Editor from '@monaco-editor/react';

function CodeEditor({ value, onChange, language = 'python', readOnly = false }) {
    const handleEditorChange = (newValue) => {
        if (onChange) {
            onChange(newValue);
        }
    };

    return (
        <Editor
            height="100%"
            language={language}
            value={value}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
                readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                wordWrap: 'on',
                tabSize: 4,
                insertSpaces: true,
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
            }}
        />
    );
}

export default CodeEditor;
