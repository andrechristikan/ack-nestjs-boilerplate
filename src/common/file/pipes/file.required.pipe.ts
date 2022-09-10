import {
    PipeTransform,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { IFile } from 'src/common/file/interfaces/file.interface';

@Injectable()
export class FileRequiredPipe implements PipeTransform {
    async transform(value: IFile | IFile[]): Promise<IFile | IFile[]> {
        await this.validate(value);

        return value;
    }

    async validate(value: IFile | IFile[]): Promise<void> {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_NEEDED_ERROR,
                message: 'file.error.notFound',
            });
        }

        return;
    }
}
