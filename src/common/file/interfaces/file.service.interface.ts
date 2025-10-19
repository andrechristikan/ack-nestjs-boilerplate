import {
    IFileRandomFilenameOptions,
    IFileSheet,
} from '@common/file/interfaces/file.interface';

export interface IFileService {
    writeCsv<T = Record<string, string | number | Date>>(
        rows: IFileSheet<T>
    ): Buffer;
    writeCsvFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Buffer;
    writeExcel<T = Record<string, string | number | Date>>(
        rows: IFileSheet<T>[]
    ): Buffer;
    writeExcelFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Buffer;
    readCsv<T = Record<string, string | number | Date>>(
        file: Buffer | string
    ): IFileSheet<T>;
    readExcel<T = Record<string, string | number | Date>>(
        file: Buffer
    ): IFileSheet<T>[];
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
