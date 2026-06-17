import bytes from 'bytes';

export const FileSizeInBytes: number = bytes('10mb') ?? 0;

export const FileMaxMultiple: number = 3;

export const FileMaxDataImport = 1000;
