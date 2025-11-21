import { Injectable } from '@nestjs/common';
import { IFileService } from '@common/file/interfaces/file.service.interface';
import { read, utils, write } from 'xlsx';
import {
    IFileRandomFilenameOptions,
    IFileSheet,
} from '@common/file/interfaces/file.interface';
import { HelperService } from '@common/helper/services/helper.service';
import Mime from 'mime';
import { ENUM_FILE_EXTENSION_EXCEL } from '@common/file/enums/file.enum';

/**
 * Service for handling file operations including CSV and Excel file creation and reading.
 * Provides methods to write and read files in various formats with support for generic data types.
 */
@Injectable()
export class FileService implements IFileService {
    constructor(private readonly helperService: HelperService) {}

    /**
     * Writes data to CSV format using semicolon as field separator.
     * Converts JSON data to CSV buffer for download or storage.
     * @template T - Type of data records (defaults to Record<string, string | number | Date>)
     * @param {IFileSheet<T>} sheet - File sheet object containing data and optional sheet name
     * @returns {Buffer} Buffer containing the CSV data
     */
    writeCsv<T = Record<string, string | number | Date>>(
        sheet: IFileSheet<T>
    ): Buffer {
        const worksheet = utils.json_to_sheet(sheet.data);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    /**
     * Writes array data to CSV format using semicolon as field separator.
     * Converts 2D array data to CSV buffer for download or storage.
     * @template T - Type of data records (defaults to Record<string, string | number | Date>)
     * @param {T[][]} sheets - 2D array of data where each sub-array represents a row
     * @returns {Buffer} Buffer containing the CSV data
     */
    writeCsvFromArray<T = Record<string, string | number | Date>>(
        sheets: T[][]
    ): Buffer {
        const worksheet = utils.aoa_to_sheet(sheets);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    /**
     * Writes data to Excel (XLSX) format with support for multiple sheets.
     * Creates a workbook with multiple worksheets from the provided data.
     * @template T - Type of data records (defaults to Record<string, string | number | Date>)
     * @param {IFileSheet<T>[]} sheets - Array of file sheet objects, each representing a sheet with data and optional sheet name
     * @returns {Buffer} Buffer containing the Excel data
     */
    writeExcel<T = Record<string, string | number | Date>>(
        sheets: IFileSheet<T>[]
    ): Buffer {
        const workbook = utils.book_new();

        for (const [index, sheet] of sheets.entries()) {
            const worksheet = utils.json_to_sheet(sheet.data);
            utils.book_append_sheet(
                workbook,
                worksheet,
                sheet.sheetName ?? `Sheet${index + 1}`
            );
        }

        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_FILE_EXTENSION_EXCEL.XLSX,
        });

        return buff;
    }

    /**
     * Writes 2D array data to Excel (XLSX) format as a single sheet.
     * Creates a workbook with one worksheet from the provided array data.
     * @template T - Type of data records (defaults to Record<string, string | number | Date>)
     * @param {T[][]} sheets - 2D array of data where each sub-array represents a row
     * @returns {Buffer} Buffer containing the Excel data
     */
    writeExcelFromArray<T = Record<string, string | number | Date>>(
        sheets: T[][]
    ): Buffer {
        const workbook = utils.book_new();

        const worksheet = utils.aoa_to_sheet(sheets);
        utils.book_append_sheet(workbook, worksheet, `Sheet1`);

        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_FILE_EXTENSION_EXCEL.XLSX,
        });

        return buff;
    }

    /**
     * Reads CSV data from a buffer or string and converts it to JSON format.
     * Parses the first sheet of the CSV file and returns the data with sheet information.
     * @template T - Type of data records (defaults to Record<string, string | number | Date>)
     * @param {Buffer | string} file - Buffer or string containing the CSV file data
     * @returns {IFileSheet<T>} IFileSheet object containing the parsed data and sheet name
     */
    readCsv<T = Record<string, string | number | Date>>(
        file: Buffer | string
    ): IFileSheet<T> {
        const workbook = read(file, {
            type: typeof file === 'string' ? 'string' : 'buffer',
        });

        const worksheetsName: string = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetsName];
        const rows: T[] = utils.sheet_to_json(worksheet);

        return {
            data: rows,
            sheetName: worksheetsName,
        };
    }

    /**
     * Reads Excel (XLSX) data from a buffer and converts all sheets to JSON format.
     * Parses all worksheets in the Excel file and returns an array of sheet data objects,
     * each containing the parsed data and corresponding sheet name.
     * @template T - Type of data records (defaults to Record<string, string | number | Date>)
     * @param {Buffer} file - Buffer containing the Excel file data
     * @returns {IFileSheet<T>[]} Array of IFileSheet objects, each containing data and sheet name for every worksheet
     */
    readExcel<T = Record<string, string | number | Date>>(
        file: Buffer
    ): IFileSheet<T>[] {
        const workbook = read(file, {
            type: 'buffer',
        });

        const worksheetsName: string[] = workbook.SheetNames;
        const sheets: IFileSheet<T>[] = [];

        for (let i = 0; i < worksheetsName.length; i++) {
            const worksheet = workbook.Sheets[worksheetsName[i]];

            const rows: T[] = utils.sheet_to_json(worksheet);

            sheets.push({
                data: rows,
                sheetName: worksheetsName[i],
            });
        }

        return sheets;
    }

    /**
     * Generates a random filename with specified prefix and MIME type extension.
     * Creates a unique filename by combining a prefix, random string, and file extension derived from MIME type.
     * Automatically removes leading slash if present to ensure proper path formatting.
     * @param {IFileRandomFilenameOptions} options - Configuration options for filename generation
     * @param {string} [options.path] - Directory path to prepend to the filename
     * @param {string} options.prefix - Prefix to include in the filename
     * @param {string} options.extension - File extension (e.g., 'jpg', 'png', 'pdf')
     * @param {number} [options.randomLength=10] - Length of the random string portion (defaults to 10 characters)
     * @returns {string} Generated filename in format: 'prefix/randomString.extension'
     */
    createRandomFilename({
        prefix,
        path,
        extension,
        randomLength,
    }: IFileRandomFilenameOptions): string {
        const randomPath = this.helperService.randomString(randomLength ?? 10);
        let fullPath: string = `${path}/${prefix ? `${prefix}-` : ''}${randomPath}.${extension.toLowerCase()}`;

        if (fullPath.startsWith('/')) {
            fullPath = fullPath.replace('/', '');
        }

        return fullPath;
    }

    /**
     * Extracts the file extension from a given filename.
     * Returns the file extension in lowercase without the leading dot.
     * If the filename has no extension, returns an empty string.
     * @param {string} filename - The name of the file from which to extract the extension
     * @returns {string} The extracted file extension in lowercase, or an empty string if none exists
     */
    extractExtensionFromFilename(filename: string): string {
        return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    /**
     * Extracts the MIME type from a given filename.
     * Uses the file extension to determine the corresponding MIME type.
     * If the MIME type cannot be determined, returns 'application/octet-stream' as a default.
     * @param {string} filename - The name of the file from which to extract the MIME type
     * @returns {string} The extracted MIME type, or 'application/octet-stream' if undetermined
     */
    extractMimeFromFilename(filename: string): string {
        return Mime.getType(
            filename.slice(filename.lastIndexOf('.'))
        ).toLowerCase();
    }

    /**
     * Extracts the filename from a given file path.
     * Returns only the filename portion, excluding any directory paths.
     * @param {string} filePath - The full path of the file
     * @returns {string} The extracted filename
     */
    extractFilenameFromPath(filePath: string): string {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
    }
}
