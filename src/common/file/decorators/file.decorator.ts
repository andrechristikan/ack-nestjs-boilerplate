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
    FileUploadDocErrors,
} from '@common/file/constants/file.constant';
import { FileUploadErrorInterceptor } from '@common/file/interceptors/file.upload-error.interceptor';
import type {
    IFileUploadMultiple,
    IFileUploadMultipleField,
    IFileUploadMultipleFieldOptions,
    IFileUploadSingle,
} from '@common/file/interfaces/file.interface';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

/** @public */
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
        DocErrors(...FileUploadDocErrors),
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

/** @public */
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
        DocErrors(...FileUploadDocErrors),
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

/** @public */
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
        DocErrors(...FileUploadDocErrors),
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
