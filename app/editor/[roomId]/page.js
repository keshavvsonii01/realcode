'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';

const Editor = dynamic(() => import('../../../components/Editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-gray-400 flex items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        Loading editor...
      </div>
    </div>
  )
});

const AIChat = dynamic(() => import('../../../components/AIChat'), {
  ssr: false
});

export default function EditorPage() {
  const params = useParams();
  const roomId = params.roomId;
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState('javascript');
  const [socket, setSocket] = useState(null);
  const [currentUser] = useState({
    name: `User${Math.floor(Math.random() * 1000)}`,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  });
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  
  // Refs for Monaco editor access from AIChat
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.emit('join-room', { roomId, user: currentUser });

    newSocket.on('users-update', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name) => {
    return name.slice(0, 2).toUpperCase();
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-gray-900">
      {/* Sidebar */}
      <div className="w-60 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="ml-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              CodeSync
            </span>
          </div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Connected Users
          </h2>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {users.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              Waiting for users...
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg"
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm font-medium truncate">
                    {user.name}
                    {user.id === socket?.id && (
                      <span className="ml-2 text-xs text-blue-400">(You)</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {user.id === socket?.id ? 'Online' : 'Active'}
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            ))
          )}
        </div>

        {/* Copy Room ID Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={copyRoomId}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors font-medium text-sm flex items-center justify-center group"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Room ID
              </>
            )}
          </button>
          <p className="text-gray-500 text-xs mt-2 text-center truncate">
            {roomId}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          {/* Left: File Info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-300 font-medium text-sm">
                untitled.{language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : language}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-700"></div>
            <span className="text-gray-500 text-xs">
              Room: {roomId.slice(0, 8)}...
            </span>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>

            {/* AI Chat Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-4 py-1.5 ${
                isChatOpen 
                  ? 'bg-purple-600 hover:bg-purple-500' 
                  : 'bg-gray-700 hover:bg-gray-600'
              } text-white rounded-md transition-colors text-sm font-medium flex items-center`}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Assistant
            </button>

            {/* Save Button */}
            <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </button>
          </div>
        </div>

{/* Editor + AI Chat Container */}
<div className="relative flex-1 overflow-hidden">

  {/* Editor Area */}
  <div className="absolute inset-0">
    {socket && (
      <Editor
        roomId={roomId}
        socket={socket}
        currentUser={currentUser}
        language={language}
        editorRef={editorRef}
        monacoRef={monacoRef}
        onCodeChange={setCurrentCode}
      />
    )}
  </div>

  {/* BACKDROP (blur + fade) */}
  {isChatOpen && (
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
      onClick={() => setIsChatOpen(false)}
    />
  )}

  {/* AI Chat Drawer (slide-in, overlay) */}
  <div
    className={`
      absolute top-0 right-0 h-full w-80 md:w-80 z-50 shadow-2xl
      bg-gray-900 border-l border-gray-700
      transform transition-transform duration-300 ease-out
      ${isChatOpen ? "translate-x-0" : "translate-x-full"}
    `}
  >
    <AIChat
      editorRef={editorRef}
      monacoRef={monacoRef}
      currentCode={currentCode}
      language={language}
      isOpen={isChatOpen}
      onClose={() => setIsChatOpen(false)}
    />
  </div>

</div>

      </div>
    </div>
  );
}