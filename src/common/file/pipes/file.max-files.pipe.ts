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
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        if (!value) {
            return value;
        }

        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles =
            this.request.__customMaxFiles ||
            this.configService.get<number>('file.image.maxFiles');

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
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles =
            this.request.__customMaxFiles ||
            this.configService.get<number>('file.excel.maxFiles');

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
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles =
            this.request.__customMaxFiles ||
            this.configService.get<number>('file.video.maxFiles');

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
    constructor(
        @Inject(REQUEST)
        private readonly request: Request & { __customMaxFiles: number },
        private readonly configService: ConfigService
    ) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles =
            this.request.__customMaxFiles ||
            this.configService.get<number>('file.audio.maxFiles');

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}
