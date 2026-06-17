import {
    Injectable,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

/**
 * Validates an uploaded CSV file and parses its UTF-8 buffer into typed rows.
 */
@Injectable()
export class FileCsvParsePipe<T> implements PipeTransform {
    constructor(private readonly fileService: FileService) {}

    async transform(value: IFile): Promise<T[] | undefined> {
        if (!value) {
            return;
        }

        await this.validate(value);
        const data = this.fileService.readCsv(value.buffer.toString('utf-8'));

        return data as T[];
    }

    /**
     * Throws when the buffer is empty or the extension is not `csv`.
     */
    async validate(value: IFile): Promise<void> {
        if (!value.buffer || value.buffer.length === 0) {
            throw new UnprocessableEntityException({
                statusCode: EnumFileStatusCodeError.required,
                message: 'file.error.required',
            });
        }

        if (!value.originalname) {
            throw new UnsupportedMediaTypeException({
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                message: 'file.error.extensionInvalid',
            });
        }

        const extension = this.fileService.extractExtensionFromFilename(
            value.originalname
        );

        if (!extension || extension !== EnumFileExtensionDocument.csv) {
            throw new UnsupportedMediaTypeException({
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                message: 'file.error.extensionInvalid',
            });
        }

        return;
    }
}
