import { Injectable } from '@nestjs/common';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { IHelperFileService } from 'src/common/helper/interfaces/helper.file-service.interface';
import {
    IHelperFileRows,
    IHelperFileReadOptions,
} from 'src/common/helper/interfaces/helper.interface';
import { utils, write, read } from 'xlsx';

@Injectable()
export class HelperFileService implements IHelperFileService {
    writeCsv<T = any>(rows: IHelperFileRows<T>): Buffer {
        const worksheet = utils.json_to_sheet(rows.data);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        // create buffer
        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    writeExcel<T = any>(
        rows: IHelperFileRows<T>[],
        options?: IHelperFileReadOptions
    ): Buffer {
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
            password: options?.password,
        });

        return buff;
    }

    readCsv(file: Buffer): IHelperFileRows {
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

    readExcel(
        file: Buffer,
        options?: IHelperFileReadOptions
    ): IHelperFileRows[] {
        // workbook
        const workbook = read(file, {
            type: 'buffer',
            password: options?.password,
        });

        // worksheet
        const worksheetsName: string[] = workbook.SheetNames;
        const sheets: IHelperFileRows[] = [];

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
