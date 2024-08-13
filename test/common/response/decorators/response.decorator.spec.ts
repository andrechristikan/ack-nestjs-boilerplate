import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/enums/helper.enum';
import {
    RESPONSE_FILE_EXCEL_TYPE_META_KEY,
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
} from 'src/common/response/constants/response.constant';
import {
    Response,
    ResponseFileExcel,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { ResponseFileExcelInterceptor } from 'src/common/response/interceptors/response.file.interceptor';
import { ResponseInterceptor } from 'src/common/response/interceptors/response.interceptor';
import { ResponsePagingInterceptor } from 'src/common/response/interceptors/response.paging.interceptor';

jest.mock('@nestjs/common', () => ({
    ...jest.requireActual('@nestjs/common'),
    SetMetadata: jest.fn(),
    UseInterceptors: jest.fn(),
}));

jest.mock('@nestjs/cache-manager', () => ({
    ...jest.requireActual('@nestjs/cache-manager'),
    CacheKey: jest.fn(),
    CacheTTL: jest.fn(),
}));

describe('Response Decorators', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Response', () => {
        it('Should return applyDecorators', async () => {
            const result = Response('default');

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(ResponseInterceptor);
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
        });

        it('Should return applyDecorators with property', async () => {
            const result = Response('default', {
                messageProperties: {
                    test: 'aaa',
                },
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(ResponseInterceptor);
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PROPERTIES_META_KEY,
                {
                    test: 'aaa',
                }
            );
        });

        it('Should return applyDecorators with cached', async () => {
            const result = Response('default', {
                cached: true,
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(ResponseInterceptor);
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
            expect(UseInterceptors).toHaveBeenCalledWith(CacheInterceptor);
        });

        it('Should return applyDecorators with custom cached', async () => {
            const result = Response('default', {
                cached: {
                    key: 'default-test',
                    ttl: 60,
                },
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(ResponseInterceptor);
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
            expect(UseInterceptors).toHaveBeenCalledWith(CacheInterceptor);
            expect(CacheKey).toHaveBeenCalledWith('default-test');
            expect(CacheTTL).toHaveBeenCalledWith(60);
        });
    });

    describe('ResponsePaging', () => {
        it('Should return applyDecorators', async () => {
            const result = ResponsePaging('default');

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(
                ResponsePagingInterceptor
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
        });

        it('Should return applyDecorators with property', async () => {
            const result = ResponsePaging('default', {
                messageProperties: {
                    test: 'aaa',
                },
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(
                ResponsePagingInterceptor
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PROPERTIES_META_KEY,
                {
                    test: 'aaa',
                }
            );
        });

        it('Should return applyDecorators with cached', async () => {
            const result = ResponsePaging('default', {
                cached: true,
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(
                ResponsePagingInterceptor
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
            expect(UseInterceptors).toHaveBeenCalledWith(CacheInterceptor);
        });

        it('Should return applyDecorators with custom cached', async () => {
            const result = ResponsePaging('default', {
                cached: {
                    key: 'default-test',
                    ttl: 60,
                },
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(
                ResponsePagingInterceptor
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_MESSAGE_PATH_META_KEY,
                'default'
            );
            expect(UseInterceptors).toHaveBeenCalledWith(CacheInterceptor);
            expect(CacheKey).toHaveBeenCalledWith('default-test');
            expect(CacheTTL).toHaveBeenCalledWith(60);
        });
    });

    describe('ResponseFileExcel', () => {
        it('Should return applyDecorators', async () => {
            const result = ResponseFileExcel();

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(
                ResponseFileExcelInterceptor
            );
        });

        it('Should return applyDecorators with property', async () => {
            const result = ResponseFileExcel({
                type: ENUM_HELPER_FILE_EXCEL_TYPE.CSV,
            });

            expect(result).toBeTruthy();
            expect(UseInterceptors).toHaveBeenCalledWith(
                ResponseFileExcelInterceptor
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                RESPONSE_FILE_EXCEL_TYPE_META_KEY,
                ENUM_HELPER_FILE_EXCEL_TYPE.CSV
            );
        });
    });
});
