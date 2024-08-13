import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '@ntegral/nestjs-sentry';
import { Response } from 'express';
import { MessageService } from 'src/common/message/services/message.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { AppGeneralFilter } from 'src/app/filters/app.general.filter';
import { ValidationError } from 'class-validator';
import { IMessageValidationImportErrorParam } from 'src/common/message/interfaces/message.interface';

describe('AppGeneralFilter', () => {
    describe('Debug is on', () => {
        let appGeneralFilter: AppGeneralFilter;
        let mockHttpAdapterHost: HttpAdapterHost;
        let mockMessageService: MessageService;
        let mockConfigService: ConfigService;
        let mockHelperDateService: HelperDateService;
        let mockSentryService: SentryService;
        let mockResponse: Response;
        let mockRequest: IRequestApp;

        beforeEach(async () => {
            mockHttpAdapterHost = { httpAdapter: { reply: jest.fn() } } as any;
            mockMessageService = {
                getLanguage: jest.fn(),
                setMessage: jest.fn(),
            } as any;
            mockConfigService = {
                get: jest.fn().mockReturnValue(false),
            } as any;
            mockHelperDateService = { createTimestamp: jest.fn() } as any;
            mockSentryService = {
                instance: () => ({ captureException: jest.fn() }),
            } as any;
            mockResponse = {
                setHeader: jest.fn(),
                status: jest.fn(),
                json: jest.fn(),
            } as any;
            mockRequest = {
                __language: null,
                path: '/test',
                __version: null,
            } as IRequestApp;

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    AppGeneralFilter,
                    { provide: HttpAdapterHost, useValue: mockHttpAdapterHost },
                    { provide: MessageService, useValue: mockMessageService },
                    { provide: ConfigService, useValue: mockConfigService },
                    {
                        provide: HelperDateService,
                        useValue: mockHelperDateService,
                    },
                    { provide: SentryService, useValue: mockSentryService },
                ],
            }).compile();

            appGeneralFilter = module.get<AppGeneralFilter>(AppGeneralFilter);

            jest.spyOn(
                appGeneralFilter['logger'],
                'error'
            ).mockImplementation();
        });

        it('should return response', async () => {
            const mockException = new Error('Test error');
            const mockArgumentsHost = {
                switchToHttp: () => ({
                    getResponse: () => mockResponse,
                    getRequest: () => mockRequest,
                }),
            } as ArgumentsHost;

            (mockResponse.setHeader as jest.Mock).mockReturnValue(mockResponse);
            (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
            jest.spyOn(mockResponse, 'json').mockReturnValue(mockResponse);

            await appGeneralFilter.catch(mockException, mockArgumentsHost);

            expect(appGeneralFilter['logger'].error).not.toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should not send validation or import exceptions to Sentry', async () => {
            const validationException = new RequestValidationException(
                [] as ValidationError[]
            );
            const importException = new FileImportException(
                [] as IMessageValidationImportErrorParam[]
            );

            const mockArgumentsHost = {
                switchToHttp: () => ({
                    getResponse: () => mockResponse,
                    getRequest: () => mockRequest,
                }),
            } as ArgumentsHost;

            (mockResponse.setHeader as jest.Mock).mockReturnValue(mockResponse);
            (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
            jest.spyOn(mockResponse, 'json').mockReturnValue(mockResponse);

            await appGeneralFilter.catch(
                validationException,
                mockArgumentsHost
            );
            await appGeneralFilter.catch(importException, mockArgumentsHost);

            expect(appGeneralFilter['logger'].error).not.toHaveBeenCalled();
            expect(
                mockSentryService.instance().captureException
            ).not.toHaveBeenCalled();
        });

        it('should respond with the exception response if it is an HttpException', async () => {
            const httpException = new HttpException(
                'Not Found',
                HttpStatus.NOT_FOUND
            );
            const mockArgumentsHost = {
                switchToHttp: () => ({
                    getResponse: () => mockResponse,
                    getRequest: () => mockRequest,
                }),
            } as ArgumentsHost;

            await appGeneralFilter.catch(httpException, mockArgumentsHost);

            expect(appGeneralFilter['logger'].error).not.toHaveBeenCalled();
            expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
                mockResponse,
                'Not Found',
                HttpStatus.NOT_FOUND
            );
        });
    });

    describe('Debug is off', () => {
        let appGeneralFilter: AppGeneralFilter;
        let mockHttpAdapterHost: HttpAdapterHost;
        let mockMessageService: MessageService;
        let mockConfigService: ConfigService;
        let mockHelperDateService: HelperDateService;
        let mockSentryService: SentryService;
        let mockResponse: Response;
        let mockRequest: IRequestApp;

        beforeEach(async () => {
            mockHttpAdapterHost = { httpAdapter: { reply: jest.fn() } } as any;
            mockMessageService = {
                getLanguage: jest.fn(),
                setMessage: jest.fn(),
            } as any;
            mockConfigService = {
                get: jest.fn().mockReturnValue(true),
            } as any;
            mockHelperDateService = { createTimestamp: jest.fn() } as any;
            mockSentryService = {
                instance: () => ({ captureException: jest.fn() }),
            } as any;
            mockResponse = {
                setHeader: jest.fn(),
                status: jest.fn(),
                json: jest.fn(),
            } as any;
            mockRequest = {
                __language: null,
                path: '/test',
                __version: null,
            } as IRequestApp;

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    AppGeneralFilter,
                    { provide: HttpAdapterHost, useValue: mockHttpAdapterHost },
                    { provide: MessageService, useValue: mockMessageService },
                    { provide: ConfigService, useValue: mockConfigService },
                    {
                        provide: HelperDateService,
                        useValue: mockHelperDateService,
                    },
                    { provide: SentryService, useValue: mockSentryService },
                ],
            }).compile();

            appGeneralFilter = module.get<AppGeneralFilter>(AppGeneralFilter);

            jest.spyOn(
                appGeneralFilter['logger'],
                'error'
            ).mockImplementation();
        });

        it('should log error if in debug mode', async () => {
            const mockException = new Error('Test error');
            const mockArgumentsHost = {
                switchToHttp: () => ({
                    getResponse: () => mockResponse,
                    getRequest: () => mockRequest,
                }),
            } as ArgumentsHost;

            (mockResponse.setHeader as jest.Mock).mockReturnValue(mockResponse);
            (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
            jest.spyOn(mockResponse, 'json').mockReturnValue(mockResponse);

            await appGeneralFilter.catch(mockException, mockArgumentsHost);

            expect(appGeneralFilter['logger'].error).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalled();
        });
    });
});
