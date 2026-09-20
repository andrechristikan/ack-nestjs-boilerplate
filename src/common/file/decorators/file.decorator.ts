import { UseInterceptors, applyDecorators } from '@nestjs/common';
import {
    FileFieldsInterceptor,
    FileInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
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
import { DocFileErrorResponses } from '@common/doc/constants/doc.constant';

/**
 * Accepts one file under a single multipart field, with a size limit.
 * Emits multipart OpenAPI (`ApiConsumes` + binary `ApiBody`) and the upload error kit.
 * @public
 */
export function FileUploadSingle(options?: IFileUploadSingle): MethodDecorator {
    const field = options?.field ?? 'file';

    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    [field]: { type: 'string', format: 'binary' },
                },
            },
        }),
        DocFileErrorResponses.extensionInvalid,
        DocFileErrorResponses.required,
        DocFileErrorResponses.requiredExtractFirst,
        DocFileErrorResponses.exceedMaxSizeUpload,
        DocFileErrorResponses.exceedMaxFiles,
        DocFileErrorResponses.fieldUnexpected,
        DocFileErrorResponses.multipartInvalid,
        UseInterceptors(
            FileUploadErrorInterceptor,
            FileInterceptor(field, {
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
 * Emits multipart OpenAPI (`ApiConsumes` + binary `ApiBody`) and the upload error kit.
 * @public
 */
export function FileUploadMultiple(
    options?: IFileUploadMultiple
): MethodDecorator {
    const field = options?.field ?? 'files';

    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    [field]: { type: 'string', format: 'binary' },
                },
            },
        }),
        DocFileErrorResponses.extensionInvalid,
        DocFileErrorResponses.required,
        DocFileErrorResponses.requiredExtractFirst,
        DocFileErrorResponses.exceedMaxSizeUpload,
        DocFileErrorResponses.exceedMaxFiles,
        DocFileErrorResponses.fieldUnexpected,
        DocFileErrorResponses.multipartInvalid,
        UseInterceptors(
            FileUploadErrorInterceptor,
            FilesInterceptor(field, options?.maxFiles ?? FileMaxMultiple, {
                limits: {
                    fileSize: options?.fileSize ?? FileSizeInBytes,
                },
            })
        )
    );
}

/**
 * Accepts files under several named multipart fields, each with its own count limit.
 * Emits multipart OpenAPI (`ApiConsumes` + binary `ApiBody`) and the upload error kit.
 * @public
 */
export function FileUploadMultipleFields(
    fields: IFileUploadMultipleField[],
    options?: IFileUploadMultipleFieldOptions
): MethodDecorator {
    const properties = Object.fromEntries(
        fields.map(field => [
            field.field,
            { type: 'string' as const, format: 'binary' as const },
        ])
    );

    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties,
            },
        }),
        DocFileErrorResponses.extensionInvalid,
        DocFileErrorResponses.required,
        DocFileErrorResponses.requiredExtractFirst,
        DocFileErrorResponses.exceedMaxSizeUpload,
        DocFileErrorResponses.exceedMaxFiles,
        DocFileErrorResponses.fieldUnexpected,
        DocFileErrorResponses.multipartInvalid,
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
