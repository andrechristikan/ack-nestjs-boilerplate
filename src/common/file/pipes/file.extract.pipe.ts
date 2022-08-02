import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IFile, IFileExtract } from '../file.interface';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { ENUM_FILE_EXCEL_MIME } from '../constants/file.constant';

// only for excel
@Injectable()
export class FileExtractPipe implements PipeTransform {
    constructor(private readonly helperFileService: HelperFileService) {}

    async transform(value: IFile): Promise<IFileExtract> {
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

        const extract = await this.helperFileService.readExcel(value.buffer);

        return {
            ...value,
            extract,
        };
    }
}
