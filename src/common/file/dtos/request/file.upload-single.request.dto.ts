import { z } from 'zod';
import type { IFile } from '@common/file/interfaces/file.interface';

/**
 * Multipart body shape for endpoints accepting a single file upload.
 * @public
 */
export const FileUploadSingleRequestSchema = z.strictObject({
    file: z.custom<IFile>().meta({
        type: 'string',
        format: 'binary',
        description: 'Single file',
    }),
});

/**
 * Multipart body carrying a single uploaded file.
 * @public
 */
export type FileUploadSingleRequestDto = z.infer<
    typeof FileUploadSingleRequestSchema
>;
