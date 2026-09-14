import { z } from 'zod';
import { IFile } from '@common/file/interfaces/file.interface';

/**
 * Multipart body shape for endpoints accepting multiple file uploads.
 */
export const FileUploadMultipleRequestSchema = z.strictObject({
    files: z
        .array(
            z.custom<IFile>().meta({
                type: 'string',
                format: 'binary',
                description: 'Multi file',
            })
        )
        .meta({
            description: 'Files uploaded in this request',
        }),
});

export type FileUploadMultipleRequestDto = z.infer<
    typeof FileUploadMultipleRequestSchema
>;
