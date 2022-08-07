import {
    PipeTransform,
    Injectable,
    PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ENUM_FILE_AUDIO_MIME,
    ENUM_FILE_EXCEL_MIME,
    ENUM_FILE_IMAGE_MIME,
    ENUM_FILE_VIDEO_MIME,
} from '../constants/file.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

@Injectable()
export class FileSizePipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

    async transform(value: IFile): Promise<IFile> {
        let maxSizeOnBytes = this.configService.get<number>(
            'file.default.maxFileSize'
        );

        if (
            Object.values(ENUM_FILE_EXCEL_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            maxSizeOnBytes = this.configService.get<number>(
                'file.excel.maxFileSize'
            );
        } else if (
            Object.values(ENUM_FILE_IMAGE_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            maxSizeOnBytes = this.configService.get<number>(
                'file.image.maxFileSize'
            );
        } else if (
            Object.values(ENUM_FILE_AUDIO_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            maxSizeOnBytes = this.configService.get<number>(
                'file.audio.maxFileSize'
            );
        } else if (
            Object.values(ENUM_FILE_VIDEO_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            maxSizeOnBytes = this.configService.get<number>(
                'file.video.maxFileSize'
            );
        }

        if (value.size > maxSizeOnBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }
        return value;
    }
}
