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
import {
    IFileUploadMultiple,
    IFileUploadMultipleField,
    IFileUploadMultipleFieldOptions,
    IFileUploadSingle,
} from 'src/common/file/interfaces/file.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

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

export const FilePartNumber: () => ParameterDecorator = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): number => {
        const request = ctx.switchToHttp().getRequest<IRequestApp>();
        const { headers } = request;
        return headers['x-part-number']
            ? Number(headers['x-part-number'])
            : undefined;
    }
);
