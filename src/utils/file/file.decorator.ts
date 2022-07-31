import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ENUM_FILE_TYPE } from './file.constant';
import { IFileOptions } from './file.interface';
import { FileAudioInterceptor } from './interceptor/file.audio.interceptor';
import { FileExcelInterceptor } from './interceptor/file.excel.interceptor';
import { FileImageInterceptor } from './interceptor/file.image.interceptor';
import { FileVideoInterceptor } from './interceptor/file.video.interceptor';

export const GetExtractFile = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __extractFile } = ctx.switchToHttp().getRequest();
        return __extractFile;
    }
);

export const GetExtractFiles = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __extractFiles } = ctx.switchToHttp().getRequest();
        return __extractFiles;
    }
);

export const GetRawExtractFile = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __rawExtractFile } = ctx.switchToHttp().getRequest();
        return __rawExtractFile;
    }
);

export const GetRawExtractFiles = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __rawExtractFiles } = ctx.switchToHttp().getRequest();
        return __rawExtractFiles;
    }
);

export function UploadFileSingle(field: string, options?: IFileOptions): any {
    if (options && options.type === ENUM_FILE_TYPE.IMAGE) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileImageInterceptor({
                    required:
                        options && options.required ? options.required : false,
                })
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.EXCEL) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileExcelInterceptor({
                    required:
                        options && options.required ? options.required : false,
                    extract:
                        options && options.extract ? options.extract : false,
                    dto: options && options.dto ? options.dto : undefined,
                })
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.AUDIO) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileAudioInterceptor({
                    required:
                        options && options.required ? options.required : false,
                })
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.VIDEO) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileVideoInterceptor({
                    required:
                        options && options.required ? options.required : false,
                })
            )
        );
    }

    return applyDecorators(UseInterceptors(FileInterceptor(field)));
}

export function UploadFileMultiple(field: string, options?: IFileOptions): any {
    if (options && options.type === ENUM_FILE_TYPE.IMAGE) {
        return applyDecorators(
            UseInterceptors(
                FilesInterceptor(field),
                FileImageInterceptor({
                    required:
                        options && options.required ? options.required : false,
                })
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.EXCEL) {
        return applyDecorators(
            UseInterceptors(
                FilesInterceptor(field),
                FileExcelInterceptor({
                    required:
                        options && options.required ? options.required : false,
                    extract:
                        options && options.extract ? options.extract : false,
                    dto: options && options.dto ? options.dto : undefined,
                })
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.AUDIO) {
        return applyDecorators(
            UseInterceptors(
                FilesInterceptor(field),
                FileAudioInterceptor({
                    required:
                        options && options.required ? options.required : false,
                })
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.VIDEO) {
        return applyDecorators(
            UseInterceptors(
                FilesInterceptor(field),
                FileVideoInterceptor({
                    required:
                        options && options.required ? options.required : false,
                })
            )
        );
    }

    return applyDecorators(UseInterceptors(FilesInterceptor(field)));
}
