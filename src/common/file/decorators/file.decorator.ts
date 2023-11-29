import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
    FILE_SIZE_IN_BYTES,
    FILE_SIZE_LARGE_IN_BYTES,
    FILE_SIZE_MEDIUM_IN_BYTES,
} from 'src/common/file/constants/file.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function FileUploadSingle(field?: string): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileInterceptor(field ?? 'file', {
                limits: {
                    fileSize: FILE_SIZE_IN_BYTES,
                    files: 1,
                },
            })
        )
    );
}

export function FileUploadSingleMedium(field?: string): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileInterceptor(field ?? 'file', {
                limits: {
                    fileSize: FILE_SIZE_MEDIUM_IN_BYTES,
                    files: 1,
                },
            })
        )
    );
}

export function FileUploadSingleLarge(field?: string): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FileInterceptor(field ?? 'file', {
                limits: {
                    fileSize: FILE_SIZE_LARGE_IN_BYTES,
                    files: 1,
                },
            })
        )
    );
}

export function FileUploadMultiple(
    field?: string,
    maxFiles?: number
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FilesInterceptor(field ?? 'files', maxFiles ?? 2, {
                limits: {
                    fileSize: FILE_SIZE_IN_BYTES,
                },
            })
        )
    );
}

export function FileUploadMultipleMedium(
    field?: string,
    maxFiles?: number
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FilesInterceptor(field ?? 'files', maxFiles ?? 2, {
                limits: {
                    fileSize: FILE_SIZE_MEDIUM_IN_BYTES,
                },
            })
        )
    );
}

export function FileUploadMultipleLarge(
    field?: string,
    maxFiles?: number
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(
            FilesInterceptor(field ?? 'files', maxFiles ?? 2, {
                limits: {
                    fileSize: FILE_SIZE_LARGE_IN_BYTES,
                },
            })
        )
    );
}

export const FilePartNumber: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): number => {
        const request = ctx.switchToHttp().getRequest<IRequestApp>();
        const { headers } = request;
        return headers['x-part-number'] ? Number(headers['x-part-number']) : 0;
    }
);
