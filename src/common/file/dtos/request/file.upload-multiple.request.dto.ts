import { z } from 'zod';
import type { IFile } from '@common/file/interfaces/file.interface';

/** @public */
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

/** @public */
export type FileUploadMultipleRequestDto = z.infer<
    typeof FileUploadMultipleRequestSchema
>;
