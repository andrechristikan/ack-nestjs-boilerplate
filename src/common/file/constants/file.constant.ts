import bytes from 'bytes';

/**
 * Default maximum size of one uploaded file.
 * @public
 */
export const FileSizeInBytes: number = bytes('10mb') ?? 0;

/**
 * Default maximum number of files in one multiple-file upload.
 * @public
 */
export const FileMaxMultiple: number = 3;
