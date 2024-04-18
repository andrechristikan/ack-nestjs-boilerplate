import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseInterceptors,
} from '@nestjs/common';
import {
    FileFieldsInterceptor,
    FileInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import { FILE_SIZE_IN_BYTES } from 'src/common/file/constants/file.constant';
import { IFileMultipleField } from 'src/common/file/interfaces/file.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function FileUploadSingle(
    field = 'file',
    fileSize = FILE_SIZE_IN_BYTES
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileInterceptor(field ?? 'file', {
                limits: {
                    fileSize,
                    files: 1,
                },
            })
        )
    );
}

export function FileUploadMultiple(
    field = 'files',
    maxFiles = 2,
    fileSize = FILE_SIZE_IN_BYTES
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FilesInterceptor(field ?? 'files', maxFiles, {
                limits: {
                    fileSize,
                },
            })
        )
    );
}

export function FileUploadMultipleFields(
    fields: IFileMultipleField[],
    fileSize = FILE_SIZE_IN_BYTES
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
                        fileSize,
                    },
                }
            )
        )
    );
}

export const FilePartNumber: () => ParameterDecorator = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): number => {
        const request = ctx.switchToHttp().getRequest<IRequestApp>();
        const { headers } = request;
        return headers['x-part-number'] ? Number(headers['x-part-number']) : 0;
    }
);
