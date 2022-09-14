import {
    PipeTransform,
    Injectable,
    PayloadTooLargeException,
    Scope,
    Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';

@Injectable({ scope: Scope.REQUEST })
export class FileSizeImagePipe implements PipeTransform {
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customFileSize: string },
        private readonly configService: ConfigService,
        private readonly helperFileService: HelperFileService
    ) {}

    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.size);
            }

            return value;
        }

        const file: IFile = value as IFile;
        await this.validate(file.size);

        return value;
    }

    async validate(size: number): Promise<void> {
        const maxSizeInBytes = this.request.__customFileSize
            ? this.helperFileService.convertToBytes(
                  this.request.__customFileSize
              )
            : this.configService.get<number>('file.image.maxFileSize');

        if (size > maxSizeInBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class FileSizeExcelPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customFileSize: string },
        private readonly configService: ConfigService,
        private readonly helperFileService: HelperFileService
    ) {}

    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.size);
            }

            return value;
        }

        const file: IFile = value as IFile;
        await this.validate(file.size);

        return value;
    }

    async validate(size: number): Promise<void> {
        const maxSizeInBytes = this.request.__customFileSize
            ? this.helperFileService.convertToBytes(
                  this.request.__customFileSize
              )
            : this.configService.get<number>('file.excel.maxFileSize');

        if (size > maxSizeInBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class FileSizeVideoPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customFileSize: string },
        private readonly configService: ConfigService,
        private readonly helperFileService: HelperFileService
    ) {}

    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.size);
            }

            return value;
        }

        const file: IFile = value as IFile;
        await this.validate(file.size);

        return value;
    }

    async validate(size: number): Promise<void> {
        const maxSizeInBytes = this.request.__customFileSize
            ? this.helperFileService.convertToBytes(
                  this.request.__customFileSize
              )
            : this.configService.get<number>('file.video.maxFileSize');

        if (size > maxSizeInBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class FileSizeAudioPipe implements PipeTransform {
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customFileSize: string },
        private readonly configService: ConfigService,
        private readonly helperFileService: HelperFileService
    ) {}

    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.size);
            }

            return value;
        }

        const file: IFile = value as IFile;
        await this.validate(file.size);

        return value;
    }

    async validate(size: number): Promise<void> {
        const maxSizeInBytes = this.request.__customFileSize
            ? this.helperFileService.convertToBytes(
                  this.request.__customFileSize
              )
            : this.configService.get<number>('file.audio.maxFileSize');

        if (size > maxSizeInBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}
