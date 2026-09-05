import { z } from 'zod';
import { IFile } from '@common/file/interfaces/file.interface';

/**
 * Multipart body shape for endpoints accepting a single file upload.
 */
export const FileUploadSingleRequestSchema = z.strictObject({
    file: z.custom<IFile>().meta({
        type: 'string',
        format: 'binary',
        description: 'Single file',
    }),
});

export type FileUploadSingleRequestDto = z.infer<
    typeof FileUploadSingleRequestSchema
>;
