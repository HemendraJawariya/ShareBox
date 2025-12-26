'use client';

import { useFileStore } from '@/lib/store';
import SharedFileCard from './SharedFileCard';
import { useEffect, useState } from 'react';

export default function SharedFilesList() {
  const files = useFileStore((state) => state.files);
  const removeFile = useFileStore((state) => state.removeFile);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || files.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Shared Files ({files.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {files.map((file) => (
          <SharedFileCard
            key={file.id}
            file={file}
            onDelete={removeFile}
          />
        ))}
      </div>
    </div>
  );
}
