import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ENUM_FILE_TYPE } from './file.constant';
import { FileImageInterceptor } from './interceptor/file.image.interceptor';

export function UploadFileSingle(
    field: string,
    type: ENUM_FILE_TYPE,
    required?: boolean
): any {
    if (type === ENUM_FILE_TYPE.IMAGE) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileImageInterceptor(required)
            )
        );
    }

    return applyDecorators(UseInterceptors(FileInterceptor(field)));
}

export function UploadFileMultiple(
    field: string,
    type: ENUM_FILE_TYPE,
    required?: boolean
): any {
    if (type === ENUM_FILE_TYPE.IMAGE) {
        return applyDecorators(
            UseInterceptors(
                FilesInterceptor(field),
                FileImageInterceptor(required)
            )
        );
    }

    return applyDecorators(UseInterceptors(FilesInterceptor(field)));
}
