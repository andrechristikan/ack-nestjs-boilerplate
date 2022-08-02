import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

export function UploadFileSingle(field: string): any {
    return applyDecorators(UseInterceptors(FileInterceptor(field)));
}

export function UploadFileMultiple(field: string): any {
    return applyDecorators(UseInterceptors(FilesInterceptor(field)));
}
