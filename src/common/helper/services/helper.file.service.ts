/* istanbul ignore file */

import { Injectable } from '@nestjs/common';
import { IHelperFileExcelRows } from '../helper.interface';
import XLSX from 'xlsx';

@Injectable()
export class HelperFileService {
    async writeExcel(
        rows: IHelperFileExcelRows[],
        options?: Record<string, any>
    ): Promise<Buffer> {
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

    async readExcel(file: Buffer): Promise<IHelperFileExcelRows[]> {
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
}
