import {
    PipeTransform,
    Injectable,
    UnprocessableEntityException,
    Scope,
    Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';

// only for multiple upload

@Injectable({ scope: Scope.REQUEST })
export class FileMaxFilesImagePipe implements PipeTransform {
    private readonly maxFile: number;

    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {
        this.maxFile = this.configService.get<number>('file.image.maxFiles');
    }

    async transform(value: IFile[]): Promise<IFile[]> {
        if (!value) {
            return value;
        }

        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.request.__customMaxFiles || this.maxFile;
        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class FileMaxFilesExcelPipe implements PipeTransform {
    private readonly maxFile: number;

    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {
        this.maxFile = this.configService.get<number>('file.excel.maxFiles');
    }

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.request.__customMaxFiles || this.maxFile;

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class FileMaxFilesVideoPipe implements PipeTransform {
    private readonly maxFile: number;

    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {
        this.maxFile = this.configService.get<number>('file.video.maxFiles');
    }

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.request.__customMaxFiles || this.maxFile;

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class FileMaxFilesAudioPipe implements PipeTransform {
    private readonly maxFile: number;

    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {
        this.maxFile = this.configService.get<number>('file.audio.maxFiles');
    }

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.request.__customMaxFiles || this.maxFile;

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}
