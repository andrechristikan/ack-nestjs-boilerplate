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
 * Pipe for validating and parsing CSV files.
 *
 * This pipe validates CSV files and parses them into structured data.
 *
 * @template T - Type of data expected in each row of the parsed file
 */
@Injectable()
export class FileCsvParsePipe<T> implements PipeTransform {
    constructor(private readonly fileService: FileService) {}

    /**
     * Transforms and parses a CSV file into structured data.
     *
     * This method validates the input file and then parses it as CSV format.
     * The file buffer is converted to UTF-8 string before parsing.
     *
     * @param {IFile} value - The file to validate and parse
     * @returns {Promise<T[] | undefined>} Array of parsed data objects or undefined if no file provided
     * @throws {UnprocessableEntityException} When file buffer is empty or missing
     * @throws {UnsupportedMediaTypeException} When file extension is not CSV
     */
    async transform(value: IFile): Promise<T[] | undefined> {
        if (!value) {
            return;
        }

        await this.validate(value);
        const data = this.fileService.readCsv(value.buffer.toString('utf-8'));

        return data as T[];
    }

    /**
     * Validates the CSV file for required properties and allowed extension.
     *
     * This method checks if the file has a valid buffer with content,
     * a filename, and specifically validates that the extension is CSV.
     *
     * @param {IFile} value - The file to validate
     * @returns {Promise<void>} Resolves if validation passes
     * @throws {UnprocessableEntityException} When file buffer is empty or missing
     * @throws {UnsupportedMediaTypeException} When filename is missing or extension is not CSV
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

        if (
            extension === undefined ||
            extension === null ||
            extension === '' ||
            extension !== EnumFileExtensionDocument.csv
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                message: 'file.error.extensionInvalid',
            });
        }

        return;
    }
}
