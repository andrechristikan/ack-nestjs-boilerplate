import { Injectable } from '@nestjs/common';
import { IFileService } from '@common/file/interfaces/file.service.interface';
import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { HelperService } from '@common/helper/services/helper.service';
import Mime from 'mime';
import Papa from 'papaparse';

/**
 * Service for handling file operations including CSV file creation and reading.
 * Provides methods to write and read CSV files with support for generic data types,
 * generate random filenames, and extract file information from paths and filenames.
 */
@Injectable()
export class FileService implements IFileService {
    constructor(private readonly helperService: HelperService) {}

    /**
     * Converts structured data into CSV format string.
     * Serializes an array of objects into a CSV string with semicolon (;) as delimiter.
     * Each object property becomes a column, and the property name becomes the header.
     *
     * @template T - The type of data rows (defaults to Record<string, string | number | Date>)
     * @param {T[]} rows - Array of objects to be converted to CSV rows
     * @returns {string} CSV formatted string with semicolon delimiter
     */
    writeCsv<T = Record<string, string | number | Date>>(rows: T[]): string {
        return Papa.unparse(rows, {
            delimiter: ';',
        });
    }

    /**
     * Parses CSV string into structured data objects.
     * Reads a CSV string with semicolon (;) as delimiter and converts it into an array of objects.
     * The first row is treated as headers which become the object property names.
     * Empty lines are automatically skipped during parsing.
     *
     * @template T - The type of data rows (defaults to Record<string, string | number | Date>)
     * @param {string} file - CSV string content to be parsed
     * @returns {T[]} Array of objects parsed from CSV rows
     */
    readCsv<T = Record<string, string | number | Date>>(file: string): T[] {
        const parsed = Papa.parse<T>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
        });

        return parsed.data;
    }

    /**
     * Generates a random filename with specified prefix and extension.
     * Creates a unique filename by combining a path, optional prefix, random string, and file extension.
     * Automatically removes leading slash if present to ensure proper path formatting.
     * @param {IFileRandomFilenameOptions} options - Configuration options for filename generation
     * @param {string} options.path - Directory path to prepend to the filename
     * @param {string} [options.prefix] - Optional prefix to include in the filename before the random string
     * @param {string} options.extension - File extension (e.g., 'jpg', 'png', 'pdf')
     * @param {number} [options.randomLength=10] - Length of the random string portion (defaults to 10 characters)
     * @returns {string} Generated filename in format: 'path/prefix-randomString.extension' or 'path/randomString.extension' if no prefix
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
     * Returns the MIME type in lowercase format.
     *
     * @param {string} filename - The name of the file from which to extract the MIME type
     * @returns {string} The extracted MIME type in lowercase
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
