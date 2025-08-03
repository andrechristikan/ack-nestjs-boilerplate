import {
    ExecutionContext,
    UseInterceptors,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import {
    FileFieldsInterceptor,
    FileInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import { FILE_SIZE_IN_BYTES } from '@common/file/constants/file.constant';
import {
    IFileUploadMultiple,
    IFileUploadMultipleField,
    IFileUploadMultipleFieldOptions,
    IFileUploadSingle,
} from '@common/file/interfaces/file.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';

/**
 * Creates a decorator for handling single file upload.
 * This decorator uses FileInterceptor to handle file upload with specified field name and size limits.
 *
 * @param options - Optional configuration for single file upload
 * @param options.field - The field name for the file upload (defaults to 'file')
 * @param options.fileSize - Maximum file size in bytes (defaults to FILE_SIZE_IN_BYTES)
 * @returns A method decorator that applies file upload interceptor for single file
 */
export function FileUploadSingle(options?: IFileUploadSingle): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileInterceptor(options?.field ?? 'file', {
                limits: {
                    fileSize: options?.fileSize ?? FILE_SIZE_IN_BYTES,
                    files: 1,
                },
            })
        )
    );
}

/**
 * Creates a decorator for handling multiple file uploads with the same field name.
 * This decorator uses FilesInterceptor to handle multiple files upload with specified field name, max files count, and size limits.
 *
 * @param options - Optional configuration for multiple file upload
 * @param options.field - The field name for the file upload (defaults to 'files')
 * @param options.maxFiles - Maximum number of files allowed (defaults to 2)
 * @param options.fileSize - Maximum file size in bytes per file (defaults to FILE_SIZE_IN_BYTES)
 * @returns A method decorator that applies file upload interceptor for multiple files
 */
export function FileUploadMultiple(
    options?: IFileUploadMultiple
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FilesInterceptor(
                options?.field ?? 'files',
                options?.maxFiles ?? 2,
                {
                    limits: {
                        fileSize: options?.fileSize ?? FILE_SIZE_IN_BYTES,
                    },
                }
            )
        )
    );
}

/**
 * Creates a decorator for handling multiple file uploads with different field names.
 * This decorator uses FileFieldsInterceptor to handle files upload from multiple fields with different configurations.
 *
 * @param fields - Array of field configurations, each specifying field name and max file count
 * @param fields[].field - The field name for the file upload
 * @param fields[].maxFiles - Maximum number of files allowed for this field
 * @param options - Optional configuration for multiple field file upload
 * @param options.fileSize - Maximum file size in bytes per file (defaults to FILE_SIZE_IN_BYTES)
 * @returns A method decorator that applies file upload interceptor for multiple fields
 */
export function FileUploadMultipleFields(
    fields: IFileUploadMultipleField[],
    options?: IFileUploadMultipleFieldOptions
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileFieldsInterceptor(
                fields.map(e => ({
                    name: e.field,
                    maxCount: e.maxFiles,
                })),
                {
                    limits: {
                        fileSize: options?.fileSize ?? FILE_SIZE_IN_BYTES,
                    },
                }
            )
        )
    );
}
