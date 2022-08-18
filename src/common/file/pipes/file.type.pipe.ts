import {
    PipeTransform,
    Injectable,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
    ENUM_FILE_AUDIO_MIME,
    ENUM_FILE_EXCEL_MIME,
    ENUM_FILE_IMAGE_MIME,
    ENUM_FILE_VIDEO_MIME,
} from '../constants/file.enum.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

@Injectable()
export class FileTypeImagePipe implements PipeTransform {
    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (!value) {
            return;
            return;
        }

        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.mimetype);
            }

            return value;
        }

        const file = value as IFile;
        await this.validate(file.mimetype);

        return value;
    }

    async validate(mimetype: string): Promise<void> {
        if (
            !Object.values(ENUM_FILE_IMAGE_MIME).find(
                (val) => val === mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return;
    }
}

@Injectable()
export class FileTypeVideoPipe implements PipeTransform {
    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.mimetype);
            }

            return value;
        }

        const file = value as IFile;
        await this.validate(file.mimetype);

        return value;
    }

    async validate(mimetype: string): Promise<void> {
        if (
            !Object.values(ENUM_FILE_VIDEO_MIME).find(
                (val) => val === mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return;
    }
}

@Injectable()
export class FileTypeAudioPipe implements PipeTransform {
    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.mimetype);
            }

            return value;
        }

        const file = value as IFile;
        await this.validate(file.mimetype);

        return value;
    }

    async validate(mimetype: string): Promise<void> {
        if (
            !Object.values(ENUM_FILE_AUDIO_MIME).find(
                (val) => val === mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return;
    }
}

@Injectable()
export class FileTypeExcelPipe implements PipeTransform {
    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        if (Array.isArray(value)) {
            for (const val of value) {
                await this.validate(val.mimetype);
            }

            return value;
        }

        const file: IFile = value as IFile;
        await this.validate(file.mimetype);

        return value;
    }

    async validate(mimetype: string): Promise<void> {
        if (
            !Object.values(ENUM_FILE_EXCEL_MIME).find(
                (val) => val === mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return;
    }
}
