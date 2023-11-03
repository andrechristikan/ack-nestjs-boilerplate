import {
    PipeTransform,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';

// only for multiple upload

@Injectable()
export class FileMaxFilesPipe implements PipeTransform {
    constructor(private readonly maxFiles: number) {}

    async transform(value: IFile[]): Promise<IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile[]): Promise<void> {
        if (value.length > this.maxFiles) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_FILES_ERROR,
                message: 'file.error.maxFiles',
            });
        }

        return;
    }
}
