import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

export default function Editor({ 
  roomId, 
  socket, 
  currentUser, 
  language, 
  editorRef: parentEditorRef, 
  monacoRef: parentMonacoRef,
  onCodeChange 
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);
  const [remoteCursors, setRemoteCursors] = useState({});

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Expose to parent component for AI Chat
    if (parentEditorRef) parentEditorRef.current = editor;
    if (parentMonacoRef) parentMonacoRef.current = monaco;

    // Initialize Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Get the shared text type
    const ytext = ydoc.getText('monaco');

    // Create a simple awareness implementation
    class SimpleAwareness {
  constructor(socket, roomId, clientID) {
    this.socket = socket;
    this.roomId = roomId;
    this.clientID = clientID;

    this.states = new Map();
    this.meta = new Map();
    this.handlers = new Map(); // required by MonacoBinding
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.handlers.has(event)) {
      this.handlers.get(event).delete(handler);
    }
  }

  notify(event) {
    if (!this.handlers.has(event)) return;
    for (const handler of this.handlers.get(event)) {
      handler({ states: this.states });
    }
  }

  getLocalState() {
    return this.states.get(this.clientID);
  }

  setLocalState(state) {
    this.states.set(this.clientID, state);

    this.socket.emit("yjs-awareness", {
      roomId: this.roomId,
      update: { clientID: this.clientID, state }
    });

    this.notify("change");
  }

  setLocalStateField(field, value) {
    const s = this.getLocalState() || {};
    s[field] = value;
    this.setLocalState(s);
  }

  getStates() {
    return this.states;
  }
}

 const awareness = new SimpleAwareness(socket, roomId, socket.id);


    awarenessRef.current = awareness;

    // Set local user info
    awareness.setLocalStateField('user', {
      name: currentUser.name,
      color: currentUser.color
    });

    // Create Monaco binding
    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      awareness
    );
    bindingRef.current = binding;

    // Handle Yjs updates from this client
    ydoc.on('update', (update) => {
      // Convert update to array for transmission
      const updateArray = Array.from(update);
      socket.emit('yjs-sync', { roomId, update: updateArray });
    });

    // Handle incoming Yjs updates from other clients
    socket.on('yjs-sync', ({ update }) => {
      const uint8Array = new Uint8Array(update);
      Y.applyUpdate(ydoc, uint8Array);
    });

    // Handle incoming awareness updates
    socket.on('yjs-awareness', ({ update }) => {
      if (update.clientID !== socket.id) {
        awareness.states.set(update.clientID, update.state);
        setRemoteCursors((prev) => ({
          ...prev,
          [update.clientID]: update.state
        }));
      }
    });

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      socket.emit('cursor-position', {
        roomId,
        position: {
          lineNumber: position.lineNumber,
          column: position.column
        },
        user: currentUser
      });
    });

    // Handle remote cursor updates
    socket.on('remote-cursor', ({ userId, position, user }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: { position, user }
      }));

      // Render cursor decoration
      renderRemoteCursor(editor, monaco, userId, position, user);
    });

    // Auto-save functionality
    let saveTimeout;
    editor.onDidChangeModelContent(() => {
      clearTimeout(saveTimeout);
      
      // Update parent component with current code for AI context
      if (onCodeChange) {
        onCodeChange(editor.getValue());
      }
      
      saveTimeout = setTimeout(() => {
        const content = editor.getValue();
        socket.emit('save-code', {
          roomId,
          content,
          language
        });
      }, 2000);
    });
  };

  const renderRemoteCursor = (editor, monaco, userId, position, user) => {
    // Create decoration for remote cursor
    const decorations = editor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          options: {
            className: `remote-cursor-${userId}`,
            beforeContentClassName: `remote-cursor-label-${userId}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        }
      ]
    );

    // Auto-remove decoration after 3 seconds
    setTimeout(() => {
      if (editor && !editor._isDisposed) {
        editor.deltaDecorations(decorations, []);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      // Cleanup
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
      
      // Remove socket listeners
      if (socket) {
        socket.off('yjs-sync');
        socket.off('yjs-awareness');
        socket.off('remote-cursor');
      }
    };
  }, [socket]);

  return (
    <>
      <style jsx global>{`
        [class*="remote-cursor-"] {
          background-color: rgba(255, 100, 100, 0.3);
          border-left: 2px solid #ff6464;
        }
        [class*="remote-cursor-label-"]::before {
          content: '●';
          position: absolute;
          color: #ff6464;
          font-size: 12px;
          transform: translate(-8px, -2px);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: true,
          smoothScrolling: true,
          renderLineHighlight: 'all',
          lineHeight: 22,
          suggest: {
            showInlineDetails: true,
            preview: true
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true
          },
          parameterHints: {
            enabled: true
          },
          formatOnPaste: true,
          formatOnType: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          bracketPairColorization: {
            enabled: true
          }
        }}
      />
    </>
  );
}