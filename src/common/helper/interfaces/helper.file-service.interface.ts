import { IHelperFileExcelRows } from 'src/common/helper/interfaces/helper.interface';

export interface IHelperFileService {
    writeExcel(
        rows: IHelperFileExcelRows[],
        options?: Record<string, any>
    ): Buffer;

    readExcel(file: Buffer): IHelperFileExcelRows[];

    convertToBytes(megabytes: string): number;
}
