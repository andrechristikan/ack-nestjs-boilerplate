import {
    PipeTransform,
    Injectable,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ENUM_FILE_MIME } from 'src/common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { IFile } from 'src/common/file/interfaces/file.interface';

@Injectable()
export class FileTypePipe implements PipeTransform {
    constructor(
        readonly type: ENUM_FILE_MIME[],
        readonly field?: string
    ) {}

    async transform(value: any): Promise<IFile | IFile[]> {
        if (!value) {
            return value;
        }

        let fieldValue = value;
        if (this.field) {
            fieldValue = value[this.field];
        }

        if (
            !fieldValue ||
            Object.keys(fieldValue).length === 0 ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
        ) {
            return value;
        }

        if (Array.isArray(fieldValue)) {
            for (const val of fieldValue) {
                await this.validate(val.mimetype);
            }

            return value;
        }

        const file: IFile = fieldValue as IFile;
        await this.validate(file.mimetype);

        return value;
    }

    async validate(mimetype: string): Promise<void> {
        if (!this.type.find(val => val === mimetype.toLowerCase())) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            });
        }

        return;
    }
}
