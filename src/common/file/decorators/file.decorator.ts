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
import { FileUploadErrorInterceptor } from '@common/file/interceptors/file.upload-error.interceptor';
import type {
    IFileUploadMultiple,
    IFileUploadMultipleField,
    IFileUploadMultipleFieldOptions,
    IFileUploadSingle,
} from '@common/file/interfaces/file.interface';

/**
 * Accepts one file under a single multipart field, with a size limit.
 * @public
 */
export function FileUploadSingle(options?: IFileUploadSingle): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileUploadErrorInterceptor,
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
 * Accepts several files under one multipart field, with size and count limits.
 * @public
 */
export function FileUploadMultiple(
    options?: IFileUploadMultiple
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileUploadErrorInterceptor,
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
 * Accepts files under several named multipart fields, each with its own count limit.
 * @public
 */
export function FileUploadMultipleFields(
    fields: IFileUploadMultipleField[],
    options?: IFileUploadMultipleFieldOptions
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileUploadErrorInterceptor,
            FileFieldsInterceptor(
                fields.map(e => ({
                    name: e.field,
                    maxCount: e.maxFiles,
                })),
                {
                    limits: {
                        fileSize: options?.fileSize ?? FileSizeInBytes,
                        files: fields.reduce(
                            (total, field) => total + field.maxFiles,
                            0
                        ),
                    },
                }
            )
        )
    );
}
