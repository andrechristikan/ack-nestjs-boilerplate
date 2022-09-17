import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
    FILE_CUSTOM_MAX_FILES_META_KEY,
    FILE_CUSTOM_SIZE_META_KEY,
} from 'src/common/file/constants/file.constant';
import { FileCustomMaxFilesInterceptor } from 'src/common/file/interceptors/file.custom-max-files.interceptor';
import { FileCustomSizeInterceptor } from 'src/common/file/interceptors/file.custom-size.interceptor';

export function UploadFileSingle(field: string): any {
    return applyDecorators(UseInterceptors(FileInterceptor(field)));
}

export function UploadFileMultiple(field: string): any {
    return applyDecorators(UseInterceptors(FilesInterceptor(field)));
}

export function FileCustomMaxFile(customMaxFiles: number): any {
    return applyDecorators(
        UseInterceptors(FileCustomMaxFilesInterceptor),
        SetMetadata(FILE_CUSTOM_MAX_FILES_META_KEY, customMaxFiles)
    );
}

export function FileCustomSize(customSize: string): any {
    return applyDecorators(
        UseInterceptors(FileCustomSizeInterceptor),
        SetMetadata(FILE_CUSTOM_SIZE_META_KEY, customSize)
    );
}
