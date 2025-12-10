import {
    Injectable,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { IFile, IFileSheet } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { EnumFileExtensionExcel } from '@common/file/enums/file.enum';

/**
 * Pipe for validating and parsing Excel files.
 *
 * This pipe validates Excel files (including CSV) and parses them into
 * structured sheet data. It supports both Excel formats (.xlsx, .xls)
 * and CSV files.
 *
 * @template T - Type of data expected in each row of the parsed file
 */
@Injectable()
export class FileExcelParsePipe<T> implements PipeTransform {
    private readonly allowedExtensions: ReadonlySet<string> = new Set(
        Object.values(EnumFileExtensionExcel)
    );

    constructor(private readonly fileService: FileService) {}

    /**
     * Transforms and parses an Excel file into structured sheet data.
     *
     * This method validates the input file and then parses it based on
     * its extension (Excel or CSV format).
     *
     * @param {IFile} value - The file to validate and parse
     * @returns {Promise<IFileSheet<T>[] | undefined>} Array of parsed sheets or undefined if no file
     * @throws {UnprocessableEntityException} When file buffer is empty or missing
     * @throws {UnsupportedMediaTypeException} When file extension is not allowed
     */
    async transform(value: IFile): Promise<IFileSheet<T>[] | undefined> {
        if (!value) {
            return;
        }

        await this.validate(value);
        return this.parse(value);
    }

    /**
     * Validates the Excel file for required properties and allowed extensions.
     *
     * This method checks if the file has a valid buffer with content,
     * a filename, and an extension that's in the allowed Excel extensions list.
     *
     * @param {IFile} value - The file to validate
     * @returns {Promise<void>} Resolves if validation passes
     * @throws {UnprocessableEntityException} When file buffer is empty or missing
     * @throws {UnsupportedMediaTypeException} When filename is missing or extension is not allowed
     */
    async validate(value: IFile): Promise<void> {
        if (!value.buffer || value.buffer.length === 0) {
            throw new UnprocessableEntityException({
                statusCode: EnumFileStatusCodeError.required,
                message: 'file.error.required',
            });
        }

        if (value.filename) {
            const extension = this.fileService.extractExtensionFromFilename(
                value.filename
            );

            if (!this.allowedExtensions.has(extension)) {
                throw new UnsupportedMediaTypeException({
                    statusCode: EnumFileStatusCodeError.extensionInvalid,
                    message: 'file.error.extensionInvalid',
                });
            }
        } else {
            throw new UnsupportedMediaTypeException({
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                message: 'file.error.extensionInvalid',
            });
        }

        return;
    }

    /**
     * Parses the file based on its extension.
     *
     * This method determines the file format based on the extension
     * and delegates parsing to the appropriate method.
     *
     * @private
     * @param {IFile} value - The file to parse
     * @returns {IFileSheet<T>[]} Array of parsed sheets
     */
    private parse(value: IFile): IFileSheet<T>[] {
        const extension = this.fileService.extractExtensionFromFilename(
            value.filename
        );
        if (extension === EnumFileExtensionExcel.csv) {
            return this.parseCsv(value);
        }

        return this.parseExcel(value);
    }

    /**
     * Parses a CSV file into a sheet structure.
     *
     * This method parses CSV content and wraps it in a single sheet
     * structure to maintain consistency with Excel parsing.
     *
     * @private
     * @param {IFile} value - The CSV file to parse
     * @returns {IFileSheet<T>[]} Array containing a single parsed CSV sheet
     */
    private parseCsv(value: IFile): IFileSheet<T>[] {
        const parsedSheet: IFileSheet<T> = this.fileService.readCsv(
            value.buffer
        );
        return [parsedSheet];
    }

    /**
     * Parses an Excel file into sheet structures.
     *
     * This method parses Excel content (.xlsx, .xls) and returns
     * all sheets contained in the workbook.
     *
     * @private
     * @param {IFile} value - The Excel file to parse
     * @returns {IFileSheet<T>[]} Array of parsed Excel sheets
     */
    private parseExcel(value: IFile): IFileSheet<T>[] {
        return this.fileService.readExcel(value.buffer);
    }
}
