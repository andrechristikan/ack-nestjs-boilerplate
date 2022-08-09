/* istanbul ignore file */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import excelJs, { CellValue } from 'exceljs';
import { IHelperFileExcelRows } from '../helper.interface';
import { HelperDateService } from './helper.date.service';

@Injectable()
export class HelperFileService {
    private readonly appName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.appName = this.configService.get<string>('app.name');
    }

    async writeExcel(rows: IHelperFileExcelRows[]): Promise<Buffer> {
        if (rows.length === 0) {
            throw new Error('Rows Empty');
        }

        const workbook = new excelJs.Workbook();
        workbook.creator = this.appName;
        workbook.lastModifiedBy = this.appName;
        workbook.created = this.helperDateService.create();
        workbook.modified = this.helperDateService.create();
        workbook.properties.date1904 = true;
        workbook.views = [
            {
                x: 0,
                y: 0,
                width: 10000,
                height: 20000,
                firstSheet: 0,
                activeTab: 1,
                visibility: 'visible',
            },
        ];

        // sheet
        const worksheet = workbook.addWorksheet('Sheet 1', {
            views: [{ state: 'frozen', xSplit: 1 }, { showGridLines: true }],
        });

        // set header
        const headers = Object.keys(rows[0]);
        worksheet.columns = headers.map((val) => ({
            header: val,
            key: val,
        }));

        worksheet.addRows(rows);

        return (await workbook.xlsx.writeBuffer()) as Buffer;
    }

    async readExcel(file: Buffer): Promise<IHelperFileExcelRows[]> {
        const workbook = new excelJs.Workbook();
        await workbook.xlsx.load(file);

        const worksheet = workbook.getWorksheet(1);

        const headers: string[] = worksheet.getRow(1).values as string[];
        headers.shift();

        const rows: any[] = worksheet
            .getRows(2, worksheet.lastRow.number - 1)
            .map((val) => {
                const row: CellValue[] = val.values as CellValue[];
                row.shift();

                const newRow = {};
                row.forEach((l, i) => {
                    newRow[headers[i]] = l;
                });

                return newRow;
            });

        return rows;
    }
}
