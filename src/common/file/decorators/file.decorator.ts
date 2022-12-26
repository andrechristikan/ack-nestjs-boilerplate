import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
    FILE_CUSTOM_MAX_FILES_META_KEY,
    FILE_CUSTOM_SIZE_META_KEY,
} from 'src/common/file/constants/file.constant';
import { FileCustomMaxFilesInterceptor } from 'src/common/file/interceptors/file.custom-max-files.interceptor';
import { FileCustomSizeInterceptor } from 'src/common/file/interceptors/file.custom-size.interceptor';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function UploadFileSingle(field: string): MethodDecorator {
    return applyDecorators(UseInterceptors(FileInterceptor(field)));
}

export function UploadFileMultiple(field: string): MethodDecorator {
    return applyDecorators(UseInterceptors(FilesInterceptor(field)));
}

export function FileCustomMaxFile(customMaxFiles: number): MethodDecorator {
    return applyDecorators(
        UseInterceptors(FileCustomMaxFilesInterceptor),
        SetMetadata(FILE_CUSTOM_MAX_FILES_META_KEY, customMaxFiles)
    );
}

export function FileCustomSize(customSize: string): MethodDecorator {
    return applyDecorators(
        UseInterceptors(FileCustomSizeInterceptor),
        SetMetadata(FILE_CUSTOM_SIZE_META_KEY, customSize)
    );
}

export const FilePartNumber: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): number => {
        const request = ctx.switchToHttp().getRequest() as IRequestApp;
        const { headers } = request;
        return headers['x-part-number'] ? Number(headers['x-part-number']) : 0;
    }
);
