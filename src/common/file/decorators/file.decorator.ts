import { UseInterceptors, applyDecorators } from '@nestjs/common';
import {
    FileFieldsInterceptor,
    FileInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import {
    FileMaxMultiple,
    FileSizeInBytes,
} from '@common/file/constants/file.constant';
import {
    IFileUploadMultiple,
    IFileUploadMultipleField,
    IFileUploadMultipleFieldOptions,
    IFileUploadSingle,
} from '@common/file/interfaces/file.interface';

/**
 * Creates a decorator for handling single file upload.
 * This decorator uses FileInterceptor to handle file upload with specified field name and size limits.
 * @param {IFileUploadSingle} [options] - Optional configuration for single file upload
 * @returns {MethodDecorator} A method decorator that applies file upload interceptor for single file
 */
export function FileUploadSingle(options?: IFileUploadSingle): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileInterceptor(options?.field ?? 'file', {
                limits: {
                    fileSize: options?.fileSize ?? FileSizeInBytes,
                    files: 1,
                },
            })
        )
    );
}

/**
 * Creates a decorator for handling multiple file uploads with the same field name.
 * This decorator uses FilesInterceptor to handle multiple files upload with specified field name, max files count, and size limits.
 * @param {IFileUploadMultiple} [options] - Optional configuration for multiple file upload
 * @returns {MethodDecorator} A method decorator that applies file upload interceptor for multiple files
 */
export function FileUploadMultiple(
    options?: IFileUploadMultiple
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FilesInterceptor(
                options?.field ?? 'files',
                options?.maxFiles ?? FileMaxMultiple,
                {
                    limits: {
                        fileSize: options?.fileSize ?? FileSizeInBytes,
                    },
                }
            )
        )
    );
}

/**
 * Creates a decorator for handling multiple file uploads with different field names.
 * This decorator uses FileFieldsInterceptor to handle files upload from multiple fields with different configurations.
 * @param {IFileUploadMultipleField[]} fields - Array of field configurations, each specifying field name and max file count
 * @param {IFileUploadMultipleFieldOptions} [options] - Optional configuration for multiple field file upload
 * @returns {MethodDecorator} A method decorator that applies file upload interceptor for multiple fields
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
                        fileSize: options?.fileSize ?? FileSizeInBytes,
                        files: FileMaxMultiple,
                    },
                }
            )
        )
    );
}
