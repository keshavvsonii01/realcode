'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const createNewRoom = () => {
    const newRoomId = nanoid(10);
    router.push(`/editor/${newRoomId}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/editor/${roomId.trim()}`);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 bg-gray-800 rounded-2xl shadow-3xl border border-gray-600 p-8 md:p-12 max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            CodeSync
          </h1>
          <p className="text-gray-400 text-sm">
            Real-time collaborative code editor.
          </p>
        </div>

        {/* Create Room Button */}
        <button
          onClick={createNewRoom}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/30 mb-6 flex items-center justify-center group"
        >
          <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Room
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-800 text-gray-500 uppercase text-xs font-semibold tracking-wider">
              Or
            </span>
          </div>
        </div>

        {/* Join Room Form */}
        <form onSubmit={joinRoom} className="space-y-4">
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-400 mb-2">
              Room ID :
            </label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID to join"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={!roomId.trim()}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium border border-gray-600 hover:border-gray-500"
          >
            Join Room
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-500 text-xs">
            Collaborate in real-time with your team.
          </p>
        </div>
      </div>

      {/* Feature Pills */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 flex-wrap justify-center max-w-2xl">
        {['Real-time Sync', 'Multi-cursor', 'Auto-save'].map((feature) => (
          <div
            key={feature}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-full text-gray-300 text-xs font-medium"
          >
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}