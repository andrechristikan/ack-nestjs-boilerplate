import {
    PipeTransform,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

// only for multiple upload
@Injectable()
export class FileMaxFilesImagePipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.configService.get<number>('file.image.maxFiles');

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}

@Injectable()
export class FileMaxFilesExcelPipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.configService.get<number>('file.excel.maxFiles');

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}

@Injectable()
export class FileMaxFilesVideoPipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.configService.get<number>('file.video.maxFiles');

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}

@Injectable()
export class FileMaxFilesAudioPipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        const maxFiles = this.configService.get<number>('file.audio.maxFiles');

        if (value.length > maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}
