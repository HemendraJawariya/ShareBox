'use client';

import FileUpload from "@/components/FileUpload";
import SharedFilesList from "@/components/SharedFilesList";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Decorative circles */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="mb-6 inline-block">
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                ✨ Modern File Sharing
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Share Files Instantly
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                with QR Codes
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Fast, secure, and beautiful file sharing. Drop your files, get a QR code, and share with anyone.
            </p>
          </div>

          {/* Main Upload Area */}
          <div className="flex justify-center mb-20">
            <FileUpload />
          </div>

          {/* Shared Files List */}
          <div className="mt-16">
            <SharedFilesList />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-600">
          <p>
            © 2025 ShareBox. Share files securely and instantly. Built with Next.js 16 & React.
          </p>
        </div>
      </footer>
    </div>
  );
}
