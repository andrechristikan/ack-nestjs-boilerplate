import { createMock } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { lastValueFrom, of } from 'rxjs';
import { FileService } from 'src/common/file/services/file.service';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { RESPONSE_FILE_EXCEL_TYPE_META_KEY } from 'src/common/response/constants/response.constant';
import { ResponseFileExcelInterceptor } from 'src/common/response/interceptors/response.file.interceptor';

describe('ResponseFileExcelInterceptor', () => {
    let interceptor: ResponseFileExcelInterceptor;

    const mockHelperDateService = {
        createTimestamp: jest.fn(),
    };

    const mockFileService = {
        writeCsv: jest.fn().mockReturnValue(Buffer.from('123456')),
        writeExcel: jest.fn().mockReturnValue(Buffer.from('123456')),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseFileExcelInterceptor,
                {
                    provide: HelperDateService,
                    useValue: mockHelperDateService,
                },
                {
                    provide: FileService,
                    useValue: mockFileService,
                },
            ],
        }).compile();

        interceptor = moduleRef.get<ResponseFileExcelInterceptor>(
            ResponseFileExcelInterceptor
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should next if not http', async () => {
        const executionContext = createMock<ExecutionContext>({});
        const next: CallHandler = {
            handle: jest.fn(),
        };

        interceptor.intercept(executionContext, next);
        expect(next.handle).toHaveBeenCalled();
    });

    it('should throw an error if data is undefined', async () => {
        jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
            (key: string) => {
                switch (key) {
                    case RESPONSE_FILE_EXCEL_TYPE_META_KEY:
                        return ENUM_HELPER_FILE_EXCEL_TYPE.CSV;
                    default:
                        return null;
                }
            }
        );

        const res = { headers: {}, data: [] } as unknown as Response;
        const headers = {} as Record<string, string>;
        res.json = jest.fn();
        res.status = jest.fn(() => res);

        res.setHeader = jest
            .fn()
            .mockImplementation((key: string, value: string) => {
                headers[key] = value;

                return res;
            });
        res.getHeader = jest
            .fn()
            .mockImplementation((key: string) => headers[key]);

        const executionContext = createMock<ExecutionContext>({
            getType: () => 'http',
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    body: {},
                }),
                getResponse: jest.fn().mockReturnValue(res),
            }),
        });

        const next: CallHandler = {
            handle: () => of(undefined),
        };

        try {
            await lastValueFrom(interceptor.intercept(executionContext, next));
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe(
                'ResponseFileExcel must instanceof IResponseFileExcel'
            );
        }
    });

    it('should throw an error if data is not array', async () => {
        jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
            (key: string) => {
                switch (key) {
                    case RESPONSE_FILE_EXCEL_TYPE_META_KEY:
                        return ENUM_HELPER_FILE_EXCEL_TYPE.CSV;
                    default:
                        return null;
                }
            }
        );

        const res = { headers: {}, data: [] } as unknown as Response;
        const headers = {} as Record<string, string>;
        res.json = jest.fn();
        res.status = jest.fn(() => res);

        res.setHeader = jest
            .fn()
            .mockImplementation((key: string, value: string) => {
                headers[key] = value;

                return res;
            });
        res.getHeader = jest
            .fn()
            .mockImplementation((key: string) => headers[key]);

        const executionContext = createMock<ExecutionContext>({
            getType: () => 'http',
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    body: {},
                }),
                getResponse: jest.fn().mockReturnValue(res),
            }),
        });

        const next: CallHandler = {
            handle: () =>
                of({
                    data: {},
                }),
        };

        try {
            await lastValueFrom(interceptor.intercept(executionContext, next));
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe('Field data must in array');
        }
    });

    it('should return file CSV as response', async () => {
        jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
            (key: string) => {
                switch (key) {
                    case RESPONSE_FILE_EXCEL_TYPE_META_KEY:
                        return ENUM_HELPER_FILE_EXCEL_TYPE.CSV;
                    default:
                        return null;
                }
            }
        );

        const res = { headers: {}, data: [] } as unknown as Response;
        const headers = {} as Record<string, string>;
        res.json = jest.fn();
        res.status = jest.fn(() => res);

        res.setHeader = jest
            .fn()
            .mockImplementation((key: string, value: string) => {
                headers[key] = value;

                return res;
            });
        res.getHeader = jest
            .fn()
            .mockImplementation((key: string) => headers[key]);

        const executionContext = createMock<ExecutionContext>({
            getType: () => 'http',
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    body: {},
                }),
                getResponse: jest.fn().mockReturnValue(res),
            }),
        });

        const next: CallHandler = {
            handle: () =>
                of({
                    statusCode: 200,
                    data: [],
                }),
        };

        const result = await lastValueFrom(
            interceptor.intercept(executionContext, next)
        );

        expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should return file XLSX as response', async () => {
        jest.spyOn(interceptor['reflector'], 'get').mockImplementation(
            (key: string) => {
                switch (key) {
                    case RESPONSE_FILE_EXCEL_TYPE_META_KEY:
                        return ENUM_HELPER_FILE_EXCEL_TYPE.XLSX;
                    default:
                        return null;
                }
            }
        );

        const res = { headers: {}, data: [] } as unknown as Response;
        const headers = {} as Record<string, string>;
        res.json = jest.fn();
        res.status = jest.fn(() => res);

        res.setHeader = jest
            .fn()
            .mockImplementation((key: string, value: string) => {
                headers[key] = value;

                return res;
            });
        res.getHeader = jest
            .fn()
            .mockImplementation((key: string) => headers[key]);

        const executionContext = createMock<ExecutionContext>({
            getType: () => 'http',
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    body: {},
                }),
                getResponse: jest.fn().mockReturnValue(res),
            }),
        });

        const next: CallHandler = {
            handle: () =>
                of({
                    statusCode: 200,
                    data: [],
                }),
        };

        const result = await lastValueFrom(
            interceptor.intercept(executionContext, next)
        );

        expect(result).toBeInstanceOf(StreamableFile);
    });
});
