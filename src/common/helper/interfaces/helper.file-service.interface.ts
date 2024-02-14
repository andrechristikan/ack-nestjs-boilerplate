import {
    IHelperFileReadOptions,
    IHelperFileRows,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperFileService {
    writeCsv<T = any>(rows: IHelperFileRows<T>): Buffer;
    writeExcel<T = any>(
        rows: IHelperFileRows<T>[],
        options?: IHelperFileReadOptions
    ): Buffer;
    readCsv(file: Buffer): IHelperFileRows;
    readExcel(
        file: Buffer,
        options?: IHelperFileReadOptions
    ): IHelperFileRows[];
}
