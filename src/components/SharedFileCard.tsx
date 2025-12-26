'use client';

import { useState } from 'react';
import { 
  Copy, Trash2, Mail, MessageCircle, MessageSquare, 
  Send, Check, Clock
} from 'lucide-react';
import { SharedFile } from '@/lib/store';
import { formatFileSize, getExpiryIn } from '@/lib/encryption';
import {
  generateEmailShareUrl,
  generateWhatsAppShareUrl,
  generateSMSShareUrl,
  generateTelegramShareUrl,
} from '@/lib/encryption';

interface SharedFileCardProps {
  file: SharedFile;
  onDelete: (id: string) => void;
}

export default function SharedFileCard({
  file,
  onDelete,
}: SharedFileCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const expiryInfo = getExpiryIn(file.expiresAt);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(file.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaEmail = () => {
    const url = generateEmailShareUrl(file.shareUrl, file.name, file.expiresAt);
    window.location.href = url;
  };

  const shareViaWhatsApp = () => {
    const url = generateWhatsAppShareUrl(file.shareUrl, file.name, file.expiresAt);
    window.open(url, '_blank');
  };

  const shareViaSMS = () => {
    const url = generateSMSShareUrl(file.shareUrl, file.name);
    window.location.href = url;
  };

  const shareViaTelegram = () => {
    const url = generateTelegramShareUrl(file.shareUrl, file.name);
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200">
      <div className="p-6">
        {/* File Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 truncate mb-2">
            {file.name}
          </h3>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Expiry Status */}
        {!expiryInfo.expired && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            <span className="text-sm text-blue-700">
              Expires in {expiryInfo.days}d {expiryInfo.hours}h {expiryInfo.minutes}m
            </span>
          </div>
        )}

        {expiryInfo.expired && (
          <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">⚠️ This share has expired</p>
          </div>
        )}

        {/* Share Link with Copy */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Share Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={file.shareUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 truncate"
            />
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title="Copy share link to clipboard"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Send Button with Social Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSocialMenu(!showSocialMenu)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg font-medium transition-colors"
            >
              <Send size={18} />
              <span>Send</span>
            </button>
            
            {/* Social Share Menu */}
            {showSocialMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                <button
                  onClick={shareViaEmail}
                  className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 hover:bg-blue-50 transition-colors text-sm"
                >
                  <Mail size={16} className="text-blue-600" />
                  Email
                </button>
                <button
                  onClick={shareViaWhatsApp}
                  className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 hover:bg-green-50 transition-colors text-sm"
                >
                  <MessageCircle size={16} className="text-green-600" />
                  WhatsApp
                </button>
                <button
                  onClick={shareViaSMS}
                  className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 hover:bg-orange-50 transition-colors text-sm"
                >
                  <MessageSquare size={16} className="text-orange-600" />
                  SMS
                </button>
                <button
                  onClick={shareViaTelegram}
                  className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 hover:bg-sky-50 transition-colors text-sm"
                >
                  <Send size={16} className="text-sky-600" />
                  Telegram
                </button>
              </div>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(file.id)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
          >
            <Trash2 size={18} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
