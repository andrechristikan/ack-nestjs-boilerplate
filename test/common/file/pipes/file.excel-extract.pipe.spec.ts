import { UnsupportedMediaTypeException } from '@nestjs/common';
import {
    ENUM_FILE_MIME,
    ENUM_FILE_MIME_EXCEL,
} from 'src/common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { IFile, IFileRows } from 'src/common/file/interfaces/file.interface';
import { FileExcelParsePipe } from 'src/common/file/pipes/file.excel-extract.pipe';
import { FileService } from 'src/common/file/services/file.service';

describe('FileExcelParsePipe', () => {
    let pipe: FileExcelParsePipe<any>;
    let fileService: FileService;

    beforeEach(() => {
        fileService = {
            readCsv: jest.fn(),
            readExcel: jest.fn(),
        } as any;
        pipe = new FileExcelParsePipe(fileService);
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    it('should pass through valid CSV file', async () => {
        const file: IFile = {
            buffer: Buffer.from('test'),
            mimetype: ENUM_FILE_MIME.CSV,
            // other IFile properties...
        } as any;
        const expectedParse: IFileRows<any> = { data: [], sheetName: 'Sheet1' };
        (fileService.readCsv as jest.Mock).mockReturnValue(expectedParse);

        const result = await pipe.transform(file);
        expect(result).toEqual([expectedParse]);
    });

    it('should invalid CSV file', async () => {
        const result = await pipe.transform(null);
        expect(result).toEqual(undefined);
    });

    it('should pass through valid Excel file', async () => {
        const file: IFile = {
            buffer: Buffer.from('test'),
            mimetype: ENUM_FILE_MIME_EXCEL.XLSX,
            // other IFile properties...
        } as any;
        const expectedParse: IFileRows<any>[] = [
            { data: [], sheetName: 'Sheet1' },
        ];
        (fileService.readExcel as jest.Mock).mockReturnValue(expectedParse);

        const result = await pipe.transform(file);
        expect(result).toEqual(expectedParse);
    });

    it('should throw UnsupportedMediaTypeException for invalid file type', async () => {
        const file: IFile = {
            buffer: Buffer.from('test'),
            mimetype: 'application/pdf',
            // other IFile properties...
        } as any;

        await expect(pipe.transform(file)).rejects.toThrow(
            new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            })
        );
    });

    it('should validate supported file types correctly', async () => {
        const csvFile: IFile = {
            buffer: Buffer.from('test'),
            mimetype: ENUM_FILE_MIME.CSV,
        } as any;
        const xlsxFile: IFile = {
            buffer: Buffer.from('test'),
            mimetype: ENUM_FILE_MIME_EXCEL.XLSX,
        } as any;

        await expect(pipe.validate(csvFile)).resolves.toBeUndefined();
        await expect(pipe.validate(xlsxFile)).resolves.toBeUndefined();
    });

    it('should call parseCsv for CSV files', async () => {
        const file: IFile = {
            buffer: Buffer.from('test'),
            mimetype: ENUM_FILE_MIME.CSV,
            // other IFile properties...
        } as any;
        const expectedParse: IFileRows<any> = { data: [], sheetName: 'Sheet1' };
        (fileService.readCsv as jest.Mock).mockReturnValue(expectedParse);

        const result = pipe.parse(file);
        expect(result).toEqual([expectedParse]);
        expect(fileService.readCsv).toHaveBeenCalledWith(file.buffer);
    });

    it('should call parseExcel for Excel files', async () => {
        const file: IFile = {
            buffer: Buffer.from('test'),
            mimetype: ENUM_FILE_MIME_EXCEL.XLSX,
            // other IFile properties...
        } as any;
        const expectedParse: IFileRows<any>[] = [
            { data: [], sheetName: 'Sheet1' },
        ];
        (fileService.readExcel as jest.Mock).mockReturnValue(expectedParse);

        const result = pipe.parse(file);
        expect(result).toEqual(expectedParse);
        expect(fileService.readExcel).toHaveBeenCalledWith(file.buffer);
    });
});
