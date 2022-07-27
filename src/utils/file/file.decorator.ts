import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ENUM_FILE_TYPE } from './file.constant';
import { IFileOptions } from './file.interface';
import { FileExcelInterceptor } from './interceptor/file.excel.interceptor';
import { FileImageInterceptor } from './interceptor/file.image.interceptor';

export function UploadFileSingle(field: string, options?: IFileOptions): any {
    if (options && options.type === ENUM_FILE_TYPE.IMAGE) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileImageInterceptor(
                    options && options.required ? options.required : false
                )
            )
        );
    } else if (options && options.type === ENUM_FILE_TYPE.EXCEL) {
        return applyDecorators(
            UseInterceptors(
                FileInterceptor(field),
                FileExcelInterceptor(
                    options && options.required ? options.required : false
                )
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
                FileImageInterceptor(
                    options && options.required ? options.required : false
                )
            )
        );
    }

    return applyDecorators(UseInterceptors(FilesInterceptor(field)));
}
