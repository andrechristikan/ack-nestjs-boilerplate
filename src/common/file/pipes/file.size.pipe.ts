import {
    PipeTransform,
    Injectable,
    PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

@Injectable()
export class FileSizeImagePipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

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
        const maxSizeOnBytes = this.configService.get<number>(
            'file.image.maxFileSize'
        );

        if (size > maxSizeOnBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}

@Injectable()
export class FileSizeExcelPipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

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
        const maxSizeOnBytes = this.configService.get<number>(
            'file.excel.maxFileSize'
        );

        if (size > maxSizeOnBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}

@Injectable()
export class FileSizeVideoPipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

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
        const maxSizeOnBytes = this.configService.get<number>(
            'file.video.maxFileSize'
        );

        if (size > maxSizeOnBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}

@Injectable()
export class FileSizeAudioPipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

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
        const maxSizeOnBytes = this.configService.get<number>(
            'file.audio.maxFileSize'
        );

        if (size > maxSizeOnBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return;
    }
}
