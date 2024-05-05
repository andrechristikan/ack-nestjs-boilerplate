import {
    IFileReadOptions,
    IFileRows,
} from 'src/common/file/interfaces/file.interface';

export interface IFileService {
    writeCsv<T = any>(rows: IFileRows<T>): Buffer;
    writeCsvFromArray<T = any>(rows: T[][]): Buffer;
    writeExcel<T = any>(
        rows: IFileRows<T>[],
        options?: IFileReadOptions
    ): Buffer;
    writeExcelFromArray<T = any>(
        rows: T[][],
        options?: IFileReadOptions
    ): Buffer;
    readCsv(file: Buffer): IFileRows;
    readExcel(file: Buffer, options?: IFileReadOptions): IFileRows[];
}
