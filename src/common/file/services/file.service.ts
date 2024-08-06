import { Injectable } from '@nestjs/common';
import { IFileRows } from 'src/common/file/interfaces/file.interface';
import { IFileService } from 'src/common/file/interfaces/file.service.interface';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/enums/helper.enum';
import { utils, write, read } from 'xlsx';

@Injectable()
export class FileService implements IFileService {
    writeCsv<T = any>(rows: IFileRows<T>): Buffer {
        const worksheet = utils.json_to_sheet(rows.data);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        // create buffer
        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    writeCsvFromArray<T = any>(rows: T[][]): Buffer {
        const worksheet = utils.aoa_to_sheet(rows);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        // create buffer
        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    writeExcel<T = any>(rows: IFileRows<T>[]): Buffer {
        // workbook
        const workbook = utils.book_new();

        for (const [index, row] of rows.entries()) {
            // worksheet
            const worksheet = utils.json_to_sheet(row.data);
            utils.book_append_sheet(
                workbook,
                worksheet,
                row.sheetName ?? `Sheet${index + 1}`
            );
        }

        // create buffer
        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX,
        });

        return buff;
    }

    writeExcelFromArray<T = any>(rows: T[][]): Buffer {
        // workbook
        const workbook = utils.book_new();

        // worksheet
        const worksheet = utils.aoa_to_sheet(rows);
        utils.book_append_sheet(workbook, worksheet, `Sheet1`);

        // create buffer
        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX,
        });

        return buff;
    }

    readCsv(file: Buffer): IFileRows {
        // workbook
        const workbook = read(file, {
            type: 'buffer',
        });

        // worksheet
        const worksheetsName: string = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetsName];
        const rows: Record<string, string | number | Date>[] =
            utils.sheet_to_json(worksheet);

        return {
            data: rows,
            sheetName: worksheetsName,
        };
    }

    readExcel(file: Buffer): IFileRows[] {
        // workbook
        const workbook = read(file, {
            type: 'buffer',
        });

        // worksheet
        const worksheetsName: string[] = workbook.SheetNames;
        const sheets: IFileRows[] = [];

        for (let i = 0; i < worksheetsName.length; i++) {
            const worksheet = workbook.Sheets[worksheetsName[i]];

            // rows
            const rows: Record<string, string | number | Date>[] =
                utils.sheet_to_json(worksheet);

            sheets.push({
                data: rows,
                sheetName: worksheetsName[i],
            });
        }

        return sheets;
    }
}
