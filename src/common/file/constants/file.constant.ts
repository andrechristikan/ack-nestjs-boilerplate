import bytes from 'bytes';

/**
 * Maximum file size allowed in bytes (10MB).
 */
export const FileSizeInBytes: number = bytes('10mb');

/**
 * Maximum number of multiple files allowed for upload.
 */
export const FileMaxMultiple: number = 3;

/**
 * Maximum number of data rows allowed for import from a file.
 */
export const FileMaxDataImport = 1000;
