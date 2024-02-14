import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { ENUM_FILE_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { IFile, IFileExtract } from 'src/common/file/interfaces/file.interface';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';

// Support excel and csv
@Injectable()
export class FileExcelExtractPipe<T> implements PipeTransform {
    constructor(private readonly helperFileService: HelperFileService) {}

    async transform(value: IFile): Promise<IFileExtract<T>> {
        if (!value) {
            return;
        }

        await this.validate(value);

        const extracts: IHelperFileRows<T>[] = this.extracts(value);

        return {
            ...value,
            extracts,
        };
    }

    async validate(value: IFile): Promise<void> {
        const mimetype = value.mimetype.toLowerCase();
        const supportedFiles: string[] = [
            ENUM_FILE_MIME.CSV,
            ENUM_FILE_MIME.XLSX,
        ];

        if (!supportedFiles.includes(mimetype)) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }
    }

    extracts(value: IFile): IHelperFileRows<T>[] {
        if (value.mimetype === ENUM_FILE_MIME.CSV) {
            return this.extractsCsv(value);
        }

        return this.extractsExcel(value);
    }

    extractsCsv(value: IFile): IHelperFileRows<T>[] {
        const extracts: IHelperFileRows = this.helperFileService.readCsv(
            value.buffer
        );

        return [extracts];
    }

    extractsExcel(value: IFile): IHelperFileRows<T>[] {
        const extracts: IHelperFileRows[] = this.helperFileService.readExcel(
            value.buffer,
            {
                password: value?.password,
            }
        );

        return extracts;
    }
}
