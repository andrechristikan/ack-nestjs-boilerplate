import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from 'src/common/message/services/message.service';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { AppValidationFilter } from 'src/app/filters/app.validation.filter';

class MockMessageService {
    getLanguage = jest.fn().mockReturnValue('en');
    setMessage = jest.fn().mockImplementation((message: string) => message);
    setValidationMessage = jest.fn().mockImplementation(errors => errors);
}

class MockConfigService {
    get = jest.fn().mockImplementation((key: string) => {
        const config = {
            'app.debug': true,
            'app.urlVersion.version': '1.0',
            'app.repoVersion': 'v1.0.0',
        };
        return config[key];
    });
}

class MockHelperDateService {
    createTimestamp = jest.fn().mockReturnValue(new Date().toISOString());
}

describe('AppValidationFilter', () => {
    let filter: AppValidationFilter;
    let mockMessageService: MockMessageService;
    let mockConfigService: MockConfigService;
    let mockHelperDateService: MockHelperDateService;

    beforeEach(async () => {
        mockMessageService = new MockMessageService();
        mockConfigService = new MockConfigService();
        mockHelperDateService = new MockHelperDateService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppValidationFilter,
                { provide: MessageService, useValue: mockMessageService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: HelperDateService, useValue: mockHelperDateService },
            ],
        }).compile();

        filter = module.get<AppValidationFilter>(AppValidationFilter);

        jest.spyOn(filter['logger'], 'error').mockImplementation();
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    it('should handle RequestValidationException and set response correctly', async () => {
        const exception = new RequestValidationException([]);

        const mockResponse = {
            setHeader: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as unknown as Response;

        const mockRequest = {
            path: '/test',
            __language: null,
            __version: null,
        } as IRequestApp;

        const now = new Date();
        jest.spyOn(mockHelperDateService, 'createTimestamp').mockReturnValue(
            now
        );

        const mockArgumentsHost = {
            switchToHttp: () => ({
                getResponse: () => mockResponse,
                getRequest: () => mockRequest,
            }),
        } as unknown as ArgumentsHost;

        await filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-custom-lang',
            'en'
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith('x-timestamp', now);
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-timezone',
            'UTC'
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith('x-version', '1.0');
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-repo-version',
            'v1.0.0'
        );
        expect(mockResponse.status).toHaveBeenCalledWith(
            HttpStatus.UNPROCESSABLE_ENTITY
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
            statusCode: 5030,
            message: 'request.validation',
            errors: [],
            _metadata: {
                language: 'en',
                timestamp: now,
                timezone: 'UTC',
                path: '/test',
                version: '1.0',
                repoVersion: 'v1.0.0',
            },
        });
    });
});
