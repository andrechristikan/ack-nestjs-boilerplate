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
} from '../constants/file.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

@Injectable()
export class FileTypeImagePipe implements PipeTransform {
    async transform(value: IFile): Promise<IFile> {
        if (
            !Object.values(ENUM_FILE_IMAGE_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class FileTypeVideoPipe implements PipeTransform {
    async transform(value: IFile): Promise<IFile> {
        if (
            !Object.values(ENUM_FILE_VIDEO_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class FileTypeAudioPipe implements PipeTransform {
    async transform(value: IFile): Promise<IFile> {
        if (
            !Object.values(ENUM_FILE_AUDIO_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class FileTypeExcelPipe implements PipeTransform {
    async transform(value: IFile): Promise<IFile> {
        if (
            !Object.values(ENUM_FILE_EXCEL_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        return value;
    }
}
