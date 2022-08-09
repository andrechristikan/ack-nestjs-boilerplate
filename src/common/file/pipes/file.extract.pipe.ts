import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IFile, IFileExtract } from '../file.interface';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { ENUM_FILE_EXCEL_MIME } from '../constants/file.enum.constant';

// only for excel
@Injectable()
export class FileExtractPipe implements PipeTransform {
    constructor(private readonly helperFileService: HelperFileService) {}

    async transform(
        value: IFile | IFile[]
    ): Promise<IFileExtract | IFileExtract[]> {
        if (Array.isArray(value)) {
            const extracts: IFileExtract[] = [];

            for (const val of value) {
                await this.validate(val.mimetype);

                const extract: IFileExtract = await this.extract(val);
                extracts.push(extract);
            }

            return extracts;
        }

        const file: IFile = value as IFile;
        await this.validate(file.mimetype);

        return this.extract(file);
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
    }

    async extract(value: IFile): Promise<IFileExtract> {
        const extract = await this.helperFileService.readExcel(value.buffer);

        return {
            ...value,
            extract,
        };
    }
}
