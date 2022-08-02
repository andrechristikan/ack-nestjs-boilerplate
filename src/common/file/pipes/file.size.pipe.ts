import {
    PipeTransform,
    Injectable,
    PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

@Injectable()
export class FileSizePipe implements PipeTransform {
    constructor(private readonly configService: ConfigService) {}

    async transform(value: IFile): Promise<IFile> {
        const maxSizeOnBytes = this.configService.get<number>(
            'file.image.maxFileSize'
        );

        if (value.size > maxSizeOnBytes) {
            throw new PayloadTooLargeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                message: 'file.error.maxSize',
            });
        }

        return value;
    }
}
