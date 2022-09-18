import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
    FILE_CUSTOM_MAX_FILES_META_KEY,
    FILE_CUSTOM_SIZE_META_KEY,
} from 'src/common/file/constants/file.constant';
import { FileMultipleDto } from 'src/common/file/dtos/file.multiple.dto';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { FileCustomMaxFilesInterceptor } from 'src/common/file/interceptors/file.custom-max-files.interceptor';
import { FileCustomSizeInterceptor } from 'src/common/file/interceptors/file.custom-size.interceptor';
import { IFileOptions } from 'src/common/file/interfaces/file.interface';

export function UploadFileSingle(field: string, options?: IFileOptions): any {
    return applyDecorators(
        UseInterceptors(FileInterceptor(field)),
        ApiBody({
            description: 'Single file',
            type:
                options && options.classDto ? options.classDto : FileSingleDto,
        }),
        ApiConsumes('multipart/form-data')
    );
}

export function UploadFileMultiple(field: string, options?: IFileOptions): any {
    return applyDecorators(
        UseInterceptors(FilesInterceptor(field)),
        ApiBody({
            description: 'Multiple file',
            type:
                options && options.classDto
                    ? options.classDto
                    : FileMultipleDto,
        }),
        ApiConsumes('multipart/form-data')
    );
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
