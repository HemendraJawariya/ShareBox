import { create } from 'zustand';

export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  shareUrl: string;
  expiresAt: Date;
  accessToken: string;
  maxDownloads?: number;
}

interface FileStore {
  files: SharedFile[];
  addFile: (file: SharedFile) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileStore>((set) => ({
  files: [],
  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),
  clearFiles: () => set({ files: [] }),
}));
