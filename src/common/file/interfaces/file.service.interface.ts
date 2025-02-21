import { IFileRows } from 'src/common/file/interfaces/file.interface';

export interface IFileService {
    writeCsv<T = Record<string, string | number | Date>>(
        rows: IFileRows<T>
    ): Buffer;
    writeCsvFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Buffer;
    writeExcel<T = Record<string, string | number | Date>>(
        rows: IFileRows<T>[]
    ): Buffer;
    writeExcelFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Buffer;
    readCsv<T = Record<string, string | number | Date>>(
        file: Buffer
    ): IFileRows<T>;
    readExcel<T = Record<string, string | number | Date>>(
        file: Buffer
    ): IFileRows<T>[];
}
