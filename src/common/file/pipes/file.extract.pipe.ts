import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import {
    IFile,
    IFileExtract,
    IFileExtractAllSheets,
} from 'src/common/file/interfaces/file.interface';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';

// only for excel
@Injectable()
export class FileExtractPipe<T> implements PipeTransform {
    constructor(private readonly helperFileService: HelperFileService) {}

    async transform(
        value: IFile | IFile[]
    ): Promise<IFileExtract<T> | IFileExtract<T>[]> {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            const extracts: IFileExtract<T>[] = [];

            for (const val of value) {
                await this.validate(val.mimetype);

                const extract: IFileExtract<T> = await this.extract(val);
                extracts.push(extract);
            }

            return extracts;
        }

        const file: IFile = value as IFile;
        await this.validate(file.mimetype);

        const extract: IFileExtract<T> = await this.extract(file);

        return extract;
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

    async extract(value: IFile): Promise<IFileExtract<T>> {
        const extracts: IHelperFileRows[][] =
            this.helperFileService.readExcelFromBuffer(value.buffer, {
                sheet: 0,
            });

        return {
            ...value,
            extract: extracts[0],
        };
    }
}

// only for excel
@Injectable()
export class FileExtractAllSheetPipe<T> implements PipeTransform {
    constructor(private readonly helperFileService: HelperFileService) {}

    async transform(
        value: IFile | IFile[]
    ): Promise<IFileExtractAllSheets<T> | IFileExtractAllSheets<T>[]> {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            const extracts: IFileExtractAllSheets<T>[] = [];

            for (const val of value) {
                await this.validate(val.mimetype);

                const extract: IFileExtractAllSheets<T> = await this.extract(
                    val
                );
                extracts.push(extract);
            }

            return extracts;
        }

        const file: IFile = value as IFile;
        await this.validate(file.mimetype);

        const extract: IFileExtractAllSheets<T> = await this.extract(file);

        return extract;
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

    async extract(value: IFile): Promise<IFileExtractAllSheets<T>> {
        const extracts: IHelperFileRows[][] =
            this.helperFileService.readExcelFromBuffer(value.buffer);

        return {
            ...value,
            extracts: extracts,
        };
    }
}
