import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import {
    ENUM_FILE_MIME,
    ENUM_FILE_MIME_EXCEL,
} from '@common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@common/file/enums/file.status-code.enum';
import { IFile, IFileSheet } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';

/**
 * A NestJS pipe that validates and parses Excel and CSV files.
 * This pipe transforms uploaded files into structured data by extracting content
 * from Excel (.xlsx) and CSV files and converting them to JSON format.
 * @template T - The type of data records expected in the parsed file sheets
 */
@Injectable()
export class FileExcelParsePipe<T> implements PipeTransform {
    private readonly supportedMimeTypes: ReadonlySet<string> = new Set(
        Object.values(ENUM_FILE_MIME_EXCEL)
    );

    constructor(private readonly fileService: FileService) {}

    /**
     * Transforms an uploaded file into parsed sheet data.
     * Validates the file type and extracts data from Excel or CSV files.
     * @param {IFile} value - The uploaded file to process
     * @returns {Promise<IFileSheet<T>[] | undefined>} Promise resolving to an array of file sheets with parsed data, or undefined if no file provided
     * @throws {UnsupportedMediaTypeException} When file type is not supported or file is empty
     */
    async transform(value: IFile): Promise<IFileSheet<T>[] | undefined> {
        if (!value) {
            return;
        }

        await this.validate(value);
        return this.parse(value);
    }

    /**
     * Validates the uploaded file for supported MIME types and ensures it's not empty.
     * Checks that the file has a valid buffer and is of a supported Excel or CSV format.
     * @param {IFile} value - The file to validate
     * @returns {Promise<void>}
     * @throws {UnsupportedMediaTypeException} When file is empty or has unsupported MIME type
     */
    async validate(value: IFile): Promise<void> {
        if (!value.buffer || value.buffer.length === 0) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.emptyFile',
            });
        }

        const mimetype = value.mimetype.toLowerCase();

        if (!this.supportedMimeTypes.has(mimetype)) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            });
        }
    }

    /**
     * Parses the file based on its MIME type, delegating to appropriate parser method.
     * Determines whether to use CSV or Excel parsing based on the file's MIME type.
     *
     * @param value - The validated file to parse
     * @returns Array of file sheets containing parsed data
     *
     * @private
     */
    private parse(value: IFile): IFileSheet<T>[] {
        if (value.mimetype === ENUM_FILE_MIME.CSV) {
            return this.parseCsv(value);
        }

        return this.parseExcel(value);
    }

    /**
     * Parses a CSV file and returns its data as a single sheet.
     * CSV files are treated as having one sheet, so the result is wrapped in an array.
     *
     * @param value - The CSV file to parse
     * @returns Array containing a single file sheet with parsed CSV data
     *
     * @private
     */
    private parseCsv(value: IFile): IFileSheet<T>[] {
        const parsedSheet: IFileSheet<T> = this.fileService.readCsv(
            value.buffer
        );
        return [parsedSheet];
    }

    /**
     * Parses an Excel (.xlsx) file and returns data from all sheets.
     * Excel files can contain multiple worksheets, so all sheets are processed and returned.
     *
     * @param value - The Excel file to parse
     * @returns Array of file sheets, one for each worksheet in the Excel file
     *
     * @private
     */
    private parseExcel(value: IFile): IFileSheet<T>[] {
        return this.fileService.readExcel(value.buffer);
    }
}
