import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import {
    ENUM_FILE_MIME,
    ENUM_FILE_MIME_EXCEL,
} from 'src/common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { IFile, IFileRows } from 'src/common/file/interfaces/file.interface';
import { FileService } from 'src/common/file/services/file.service';

//! Support excel and csv
@Injectable()
export class FileExcelParsePipe<T> implements PipeTransform {
    constructor(private readonly fileService: FileService) {}

    async transform(value: IFile): Promise<IFileRows<T>[]> {
        if (!value) {
            return;
        }

        await this.validate(value);
        const parse: IFileRows<T>[] = this.parse(value);
        return parse;
    }

    async validate(value: IFile): Promise<void> {
        const mimetype = value.mimetype.toLowerCase();
        const supportedFiles: string[] = Object.values(ENUM_FILE_MIME_EXCEL);

        if (!supportedFiles.includes(mimetype)) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            });
        }
    }

    parse(value: IFile): IFileRows<T>[] {
        if (value.mimetype === ENUM_FILE_MIME.CSV) {
            return this.parseCsv(value);
        }

        return this.parseExcel(value);
    }

    parseCsv(value: IFile): IFileRows<T>[] {
        const parse: IFileRows = this.fileService.readCsv(value.buffer);

        return [parse];
    }

    parseExcel(value: IFile): IFileRows<T>[] {
        const parse: IFileRows[] = this.fileService.readExcel(value.buffer);

        return parse;
    }
}
