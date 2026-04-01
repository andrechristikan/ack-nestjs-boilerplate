import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';

/**
 * Contract for the FileService.
 * Defines operations for CSV processing, filename generation, and file metadata extraction.
 */
export interface IFileService {
    /**
     * Converts an array of objects into a semicolon-delimited CSV string.
     *
     * @template T - Type of data rows
     * @param {T[]} rows - Array of objects to serialize as CSV
     * @returns {string} CSV formatted string
     */
    writeCsv<T = Record<string, string | number | Date>>(rows: T[]): string;

    /**
     * Parses a semicolon-delimited CSV string into an array of typed objects.
     *
     * @template T - Expected type of each parsed row
     * @param {string} file - Raw CSV string content
     * @returns {T[]} Array of parsed row objects
     */
    readCsv<T = Record<string, string | number | Date>>(file: string): T[];

    /**
     * Generates a random filename composed of an optional path, optional prefix, a random string, and an extension.
     *
     * @param {IFileRandomFilenameOptions} options - Configuration for filename generation
     * @returns {string} Generated filename path
     */
    createRandomFilename({
        path,
        prefix,
        extension,
        randomLength,
    }: IFileRandomFilenameOptions): string;

    /**
     * Extracts the lowercase file extension (without dot) from a filename.
     *
     * @param {string} filename - Filename to inspect
     * @returns {string} Lowercase extension, or empty string if none
     */
    extractExtensionFromFilename(filename: string): string;

    /**
     * Resolves the MIME type for a filename based on its extension.
     * Returns null when the extension is unrecognized or absent.
     *
     * @param {string} filename - Filename whose extension is used for MIME lookup
     * @returns {string | null} Lowercase MIME type string, or null if unresolvable
     */
    extractMimeFromFilename(filename: string): string | null;

    /**
     * Strips the directory path from a full file path, returning only the filename.
     *
     * @param {string} filePath - Full file path to parse
     * @returns {string} Filename component of the path
     */
    extractFilenameFromPath(filePath: string): string;
}
