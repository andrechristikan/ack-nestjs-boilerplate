/* istanbul ignore file */

import { Injectable } from '@nestjs/common';
import bytes from 'bytes';
import { IHelperFileService } from 'src/common/helper/interfaces/helper.file-service.interface';
import { IHelperFileExcelRows } from 'src/common/helper/interfaces/helper.interface';
import XLSX from 'xlsx';

@Injectable()
export class HelperFileService implements IHelperFileService {
    writeExcel(
        rows: IHelperFileExcelRows[],
        options?: Record<string, any>
    ): Buffer {
        // headers
        const headers = Object.keys(rows[0]);

        // worksheet
        const worksheet = XLSX.utils.json_to_sheet(rows);

        // workbook
        const workbook = XLSX.utils.book_new();

        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            options && options.sheetName ? options.sheetName : 'Sheet 1'
        );

        // create buffer
        const buff: Buffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
        });

        return buff;
    }

    readExcel(file: Buffer): IHelperFileExcelRows[] {
        // workbook
        const workbook = XLSX.read(file);

        // worksheet
        const worksheetName = workbook.SheetNames;
        const worksheet = workbook.Sheets[worksheetName[0]];

        // rows=
        const rows: IHelperFileExcelRows[] =
            XLSX.utils.sheet_to_json(worksheet);

        return rows;
    }

    convertToBytes(megabytes: string): number {
        return bytes(megabytes);
    }
}
