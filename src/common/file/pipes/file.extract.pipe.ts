import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { IFile, IFileExtract } from 'src/common/file/interfaces/file.interface';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';

// only for excel
@Injectable()
export class FileExtractPipe implements PipeTransform {
    constructor(private readonly helperFileService: HelperFileService) {}

    async transform(
        value: IFile | IFile[]
    ): Promise<IFileExtract | IFileExtract[]> {
        if (!value) {
            return;
        }

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
