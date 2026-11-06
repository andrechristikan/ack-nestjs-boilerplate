import { z } from 'zod';
import type { IFile } from '@common/file/interfaces/file.interface';

/** @public */
export const FileUploadSingleRequestSchema = z.strictObject({
    file: z.custom<IFile>().meta({
        type: 'string',
        format: 'binary',
        description: 'Single file',
    }),
});

/** @public */
export type FileUploadSingleRequestDto = z.infer<
    typeof FileUploadSingleRequestSchema
>;
