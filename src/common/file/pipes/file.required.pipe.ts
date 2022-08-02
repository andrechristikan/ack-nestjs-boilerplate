import {
    PipeTransform,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { IFile } from '../file.interface';

@Injectable()
export class FileRequiredPipe implements PipeTransform {
    async transform(value: IFile): Promise<IFile> {
        if (!value) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_NEEDED_ERROR,
                message: 'file.error.notFound',
            });
        }

        return value;
    }
}
