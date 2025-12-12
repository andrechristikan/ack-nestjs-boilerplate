import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';

export interface IFileService {
    writeCsv<T = Record<string, string | number | Date>>(rows: T[]): string;
    readCsv<T = Record<string, string | number | Date>>(file: string): T[];
    createRandomFilename({
        path,
        prefix,
        extension,
        randomLength,
    }: IFileRandomFilenameOptions): string;
    extractExtensionFromFilename(filename: string): string;
    extractMimeFromFilename(filename: string): string;
    extractFilenameFromPath(filePath: string): string;
}
