import { Injectable } from '@nestjs/common';
import { IFileService } from '@common/file/interfaces/file.service.interface';
import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { HelperService } from '@common/helper/services/helper.service';
import Mime from 'mime';
import Papa from 'papaparse';

/**
 * Service for handling file operations such as CSV parsing, random filename generation,
 * and extracting file information from filenames and paths.
 *
 * Provides methods to:
 * - Write and read CSV files (semicolon delimiter)
 * - Generate random filenames with optional prefix and extension
 * - Extract file extension, MIME type, and filename from path
 */
@Injectable()
export class FileService implements IFileService {
    constructor(private readonly helperService: HelperService) {}

    /**
     * Converts an array of objects into a CSV string (semicolon delimiter).
     * Each object property becomes a column, and property names are used as headers.
     *
     * @template T - Type of data rows (defaults to Record<string, string | number | Date>)
     * @param {T[]} rows - Array of objects to convert to CSV
     * @returns {string} CSV formatted string (semicolon-delimited)
     */
    writeCsv<T = Record<string, string | number | Date>>(rows: T[]): string {
        return Papa.unparse(rows, {
            delimiter: ';',
        });
    }

    /**
     * Parses a semicolon-delimited CSV string into an array of objects.
     * The first row is used as headers. Empty lines are skipped.
     *
     * @template T - Type of data rows (defaults to Record<string, string | number | Date>)
     * @param {string} file - CSV string content to parse
     * @returns {T[]} Array of parsed objects
     */
    readCsv<T = Record<string, string | number | Date>>(file: string): T[] {
        const parsed = Papa.parse<T>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            fastMode: true,
            transform(value) {
                return value === '' ? null : value;
            },
        });

        return parsed.data;
    }

    /**
     * Generates a random filename with optional prefix and extension.
     * The result is formatted as 'path/prefix-randomString.extension' or 'path/randomString.extension'.
     * Leading slash is removed if present.
     *
     * @param {IFileRandomFilenameOptions} options - Options for filename generation
     * @param {string} options.path - Directory path to prepend
     * @param {string} [options.prefix] - Optional prefix before random string
     * @param {string} options.extension - File extension (e.g. 'jpg', 'pdf')
     * @param {number} [options.randomLength=10] - Length of random string (default: 10)
     * @returns {string} Generated filename
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
     * Extracts the file extension (lowercase, no dot) from a filename.
     * Returns an empty string if no extension exists.
     *
     * @param {string} filename - Filename to extract extension from
     * @returns {string} File extension in lowercase, or empty string if none
     */
    extractExtensionFromFilename(filename: string): string {
        return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    /**
     * Extracts the MIME type from a filename using its extension.
     * Returns the MIME type in lowercase.
     *
     * @param {string} filename - Filename to extract MIME type from
     * @returns {string} MIME type in lowercase
     */
    extractMimeFromFilename(filename: string): string {
        return Mime.getType(
            filename.slice(filename.lastIndexOf('.'))
        ).toLowerCase();
    }

    /**
     * Extracts the filename from a file path (removes directory path).
     *
     * @param {string} filePath - Full file path
     * @returns {string} Filename only
     */
    extractFilenameFromPath(filePath: string): string {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
    }
}
