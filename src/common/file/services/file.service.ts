import { Injectable } from '@nestjs/common';
import { IFileService } from '@common/file/interfaces/file.service.interface';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from '@common/helper/enums/helper.enum';
import { read, utils, write } from 'xlsx';
import { IFileSheet } from '@common/file/interfaces/file.interface';

/**
 * Service for handling file operations including CSV and Excel file creation and reading.
 * Provides methods to write and read files in various formats with support for generic data types.
 */
@Injectable()
export class FileService implements IFileService {
    /**
     * Writes data to CSV format using semicolon as field separator.
     * Converts JSON data to CSV buffer for download or storage.
     * @param sheet - File sheet object containing data and optional sheet name
     * @returns Buffer containing the CSV data
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
     * @param sheets - 2D array of data where each sub-array represents a row
     * @returns Buffer containing the CSV data
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
     * @param sheets - Array of file sheet objects, each representing a sheet with data and optional sheet name
     * @returns Buffer containing the Excel data
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
            bookType: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX,
        });

        return buff;
    }

    /**
     * Writes 2D array data to Excel (XLSX) format as a single sheet.
     * Creates a workbook with one worksheet from the provided array data.
     * @param sheets - 2D array of data where each sub-array represents a row
     * @returns Buffer containing the Excel data
     */
    writeExcelFromArray<T = Record<string, string | number | Date>>(
        sheets: T[][]
    ): Buffer {
        const workbook = utils.book_new();

        const worksheet = utils.aoa_to_sheet(sheets);
        utils.book_append_sheet(workbook, worksheet, `Sheet1`);

        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX,
        });

        return buff;
    }

    /**
     * Reads CSV data from a buffer and converts it to JSON format.
     * Parses the first sheet of the CSV file and returns the data with sheet information.
     * @param file - Buffer containing the CSV file data
     * @returns IFileSheet object containing the parsed data and sheet name
     */
    readCsv<T = Record<string, string | number | Date>>(
        file: Buffer
    ): IFileSheet<T> {
        const workbook = read(file, {
            type: 'buffer',
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
     * Reads CSV data from a string and converts it to JSON format.
     * Parses the first sheet of the CSV string and returns the data with sheet information.
     * @param file - String containing the CSV file data
     * @returns IFileSheet object containing the parsed data and sheet name
     */
    readCsvFromString<T = Record<string, string | number | Date>>(
        file: string
    ): IFileSheet<T> {
        const workbook = read(file, {
            type: 'string',
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
     * @param file - Buffer containing the Excel file data
     * @returns Array of IFileSheet objects, each containing data and sheet name for every worksheet
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
}
