import bytes from 'bytes';

/**
 * Maximum file size allowed in bytes (10MB).
 */
export const FILE_SIZE_IN_BYTES: number = bytes('10mb');

/**
 * Maximum number of multiple files allowed for upload.
 */
export const FILE_MAX_MULTIPLE: number = 3;
