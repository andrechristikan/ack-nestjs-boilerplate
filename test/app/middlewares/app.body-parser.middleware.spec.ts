import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ConfigService } from '@nestjs/config';
import bodyParser from 'body-parser';
import {
    AppJsonBodyParserMiddleware,
    AppRawBodyParserMiddleware,
    AppTextBodyParserMiddleware,
    AppUrlencodedBodyParserMiddleware,
} from 'src/app/middlewares/app.body-parser.middleware';

/* eslint-disable */
jest.mock('body-parser', () => ({
    urlencoded: jest
        .fn()
        .mockImplementation((a, b, c: () => null) => jest.fn()),
    raw: jest.fn().mockImplementation((a, b, c: () => null) => jest.fn()),
    text: jest.fn().mockImplementation((a, b, c: () => null) => jest.fn()),
    json: jest.fn().mockImplementation((a, b, c: () => null) => jest.fn()),
}));
/* eslint-enable */

describe('AppUrlencodedBodyParserMiddleware', () => {
    let middleware: AppUrlencodedBodyParserMiddleware;

    const mockConfigService = {
        get: jest.fn().mockReturnValue(1000),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AppUrlencodedBodyParserMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppUrlencodedBodyParserMiddleware>(
            AppUrlencodedBodyParserMiddleware
        );
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should execute bodyParser urlencoded', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            jest.spyOn(bodyParser, 'urlencoded').mockReturnValue(jest.fn());
            middleware.use(request, response, next);

            expect(bodyParser.urlencoded).toHaveBeenCalledWith({
                extended: false,
                limit: 1000,
            });
        });
    });
});

describe('AppJsonBodyParserMiddleware', () => {
    let middleware: AppJsonBodyParserMiddleware;

    const mockConfigService = {
        get: jest.fn().mockReturnValue(1000),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AppJsonBodyParserMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppJsonBodyParserMiddleware>(
            AppJsonBodyParserMiddleware
        );
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should execute bodyParser json', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            jest.spyOn(bodyParser, 'json').mockReturnValue(jest.fn());
            middleware.use(request, response, next);

            expect(bodyParser.json).toHaveBeenCalledWith({
                limit: 1000,
            });
        });
    });
});

describe('AppRawBodyParserMiddleware', () => {
    let middleware: AppRawBodyParserMiddleware;

    const mockConfigService = {
        get: jest.fn().mockReturnValue(1000),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AppRawBodyParserMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppRawBodyParserMiddleware>(
            AppRawBodyParserMiddleware
        );
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should execute bodyParser raw', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            jest.spyOn(bodyParser, 'raw').mockReturnValue(jest.fn());
            middleware.use(request, response, next);

            expect(bodyParser.raw).toHaveBeenCalledWith({
                limit: 1000,
            });
        });
    });
});

describe('AppTextBodyParserMiddleware', () => {
    let middleware: AppTextBodyParserMiddleware;

    const mockConfigService = {
        get: jest.fn().mockReturnValue(1000),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AppTextBodyParserMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppTextBodyParserMiddleware>(
            AppTextBodyParserMiddleware
        );
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should execute bodyParser text', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            jest.spyOn(bodyParser, 'text').mockReturnValue(jest.fn());
            middleware.use(request, response, next);

            expect(bodyParser.text).toHaveBeenCalledWith({
                limit: 1000,
            });
        });
    });
});
