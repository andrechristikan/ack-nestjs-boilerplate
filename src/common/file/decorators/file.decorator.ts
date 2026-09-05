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
