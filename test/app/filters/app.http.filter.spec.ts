import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { MessageService } from 'src/common/message/services/message.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { AppHttpFilter } from 'src/app/filters/app.http.filter';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

describe('AppHttpFilter', () => {
    let appHttpFilter: AppHttpFilter;
    let mockMessageService: MessageService;
    let mockConfigService: ConfigService;
    let mockHelperDateService: HelperDateService;
    let mockResponse: Response;
    let mockRequest: IRequestApp;

    beforeEach(async () => {
        mockMessageService = {
            getLanguage: jest.fn(),
            setMessage: jest.fn(),
        } as any;
        mockConfigService = {
            get: jest.fn().mockImplementation((key: string) => {
                const config = {
                    'app.debug': true,
                    'app.globalPrefix': 'api',
                    'doc.prefix': 'docs',
                };
                return config[key];
            }),
        } as any;
        mockHelperDateService = { createTimestamp: jest.fn() } as any;
        mockResponse = {
            setHeader: jest.fn(),
            status: jest.fn(),
            json: jest.fn(),
            redirect: jest.fn(),
        } as any;
        mockRequest = {
            __language: 'en',
            path: '/test',
            __version: '1.0',
        } as IRequestApp;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppHttpFilter,
                { provide: MessageService, useValue: mockMessageService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: HelperDateService, useValue: mockHelperDateService },
            ],
        }).compile();

        appHttpFilter = module.get<AppHttpFilter>(AppHttpFilter);

        jest.spyOn(appHttpFilter['logger'], 'error').mockImplementation();
    });

    it('should log error if in debug mode', async () => {
        const mockException = new HttpException(
            'Test error',
            HttpStatus.BAD_REQUEST
        );
        const mockArgumentsHost = {
            switchToHttp: () => ({
                getResponse: () => mockResponse,
                getRequest: () => mockRequest,
            }),
        } as ArgumentsHost;

        await appHttpFilter.catch(mockException, mockArgumentsHost);
        expect(mockResponse.redirect).toHaveBeenCalledWith(
            HttpStatus.PERMANENT_REDIRECT,
            'docs'
        );
    });

    it('should handle custom exceptions properly', async () => {
        jest.spyOn(mockHelperDateService, 'createTimestamp').mockReturnValue(
            Date.now()
        );
        jest.spyOn(mockMessageService, 'setMessage').mockReturnValue(
            'Custom Error'
        );
        jest.spyOn(mockMessageService, 'getLanguage').mockReturnValue(
            ENUM_MESSAGE_LANGUAGE.EN
        );

        const customExceptionResponse = {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Custom Error',
            _metadata: { customProperty: { messageProperties: {} } },
            data: { custom: 'data' },
        };
        const mockException = new HttpException(
            customExceptionResponse,
            HttpStatus.BAD_REQUEST
        );

        const mockResponse = {
            setHeader: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            redirect: jest.fn(),
        } as unknown as Response;

        const mockRequest = {
            path: 'docs',
            __language: null,
            __version: null,
        } as IRequestApp;
        appHttpFilter['app.debug'] = true;
        appHttpFilter['app.globalPrefix'] = '/path';

        const mockArgumentsHost = {
            switchToHttp: () => ({
                getResponse: () => mockResponse,
                getRequest: () => mockRequest,
            }),
        } as ArgumentsHost;

        await appHttpFilter.catch(mockException, mockArgumentsHost);

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-custom-lang',
            'en'
        );
    });

    it('isErrorException return true', () => {
        expect(
            appHttpFilter.isErrorException({
                statusCode: 200,
                message: 'message',
            })
        ).toBe(true);
    });

    it('isErrorException return false', () => {
        expect(appHttpFilter.isErrorException('')).toBe(false);
    });
});
