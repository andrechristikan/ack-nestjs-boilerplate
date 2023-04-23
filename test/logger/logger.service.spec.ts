import { Test, TestingModule } from '@nestjs/testing';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { LoggerRepository } from 'src/common/logger/repository/repositories/logger.repository';
import { LoggerService } from 'src/common/logger/services/logger.service';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';

describe('LoggerService', () => {
    let service: LoggerService;
    let repository: LoggerRepository;

    beforeEach(async () => {
        const moduleRefRef: TestingModule = await Test.createTestingModule({
            providers: [
                LoggerService,
                {
                    provide: LoggerRepository,
                    useValue: {
                        create: jest.fn().mockReturnValue({ id: '123' }),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<LoggerService>(LoggerService);
        repository = moduleRefRef.get<LoggerRepository>(LoggerRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('info()', () => {
        it('should call the repository with correct params', async () => {
            const loggerCreateDto = {
                action: ENUM_LOGGER_ACTION.TEST,
                description: 'test description',
                apiKey: 'test apikey',
                user: 'test user',
                method: ENUM_REQUEST_METHOD.GET,
                requestId: 'test requestid',
                role: 'test role',
                type: ENUM_ROLE_TYPE.USER,
                params: { testParam: 'test value' },
                bodies: { testBody: 'test value' },
                path: 'test/path',
                statusCode: 200,
                tags: ['tag1', 'tag2'],
            };
            const result = await service.info(loggerCreateDto);

            expect(repository.create).toHaveBeenCalledWith({
                level: ENUM_LOGGER_LEVEL.INFO,
                anonymous: false,
                ...loggerCreateDto,
            });
            expect(result).toEqual({ id: '123' });
        });
    });

    describe('debug()', () => {
        it('should call the repository with correct params', async () => {
            const loggerCreateDto = {
                action: ENUM_LOGGER_ACTION.TEST,
                description: 'test description',
                apiKey: 'test apikey',
                user: 'test user',
                method: ENUM_REQUEST_METHOD.GET,
                requestId: 'test requestid',
                role: 'test role',
                type: ENUM_ROLE_TYPE.USER,
                params: { testParam: 'test value' },
                bodies: { testBody: 'test value' },
                path: 'test/path',
                statusCode: 200,
                tags: ['tag1', 'tag2'],
            };
            const result = await service.debug(loggerCreateDto);

            expect(repository.create).toHaveBeenCalledWith({
                level: ENUM_LOGGER_LEVEL.DEBUG,
                anonymous: false,
                ...loggerCreateDto,
            });
            expect(result).toEqual({ id: '123' });
        });
    });

    describe('warn()', () => {
        it('should call the repository with correct params', async () => {
            const loggerCreateDto = {
                action: ENUM_LOGGER_ACTION.TEST,
                description: 'test description',
                apiKey: 'test apikey',
                user: 'test user',
                method: ENUM_REQUEST_METHOD.GET,
                requestId: 'test requestid',
                role: 'test role',
                type: ENUM_ROLE_TYPE.USER,
                params: { testParam: 'test value' },
                bodies: { testBody: 'test value' },
                path: 'test/path',
                statusCode: 200,
                tags: ['tag1', 'tag2'],
            };
            const result = await service.warn(loggerCreateDto);

            expect(repository.create).toHaveBeenCalledWith({
                level: ENUM_LOGGER_LEVEL.WARN,
                anonymous: false,
                ...loggerCreateDto,
            });
            expect(result).toEqual({ id: '123' });
        });
    });

    describe('fatal()', () => {
        it('should call the repository with correct params', async () => {
            const loggerCreateDto = {
                action: ENUM_LOGGER_ACTION.TEST,
                description: 'test description',
                apiKey: 'test apikey',
                user: 'test user',
                method: ENUM_REQUEST_METHOD.GET,
                requestId: 'test requestid',
                role: 'test role',
                type: ENUM_ROLE_TYPE.USER,
                params: { testParam: 'test value' },
                bodies: { testBody: 'test value' },
                path: 'test/path',
                statusCode: 200,
                tags: ['tag1', 'tag2'],
            };
            const result = await service.fatal(loggerCreateDto);

            expect(repository.create).toHaveBeenCalledWith({
                level: ENUM_LOGGER_LEVEL.FATAL,
                anonymous: false,
                ...loggerCreateDto,
            });
            expect(result).toEqual({ id: '123' });
        });
    });

    describe('raw()', () => {
        it('should call the repository with correct params', async () => {
            const loggerCreateRawDto = {
                level: ENUM_LOGGER_LEVEL.FATAL,
                anonymous: false,
                action: ENUM_LOGGER_ACTION.TEST,
                description: 'test description',
                apiKey: 'test apikey',
                user: 'test user',
                method: ENUM_REQUEST_METHOD.GET,
                requestId: 'test requestid',
                role: 'test role',
                type: ENUM_ROLE_TYPE.USER,
                params: { testParam: 'test value' },
                bodies: { testBody: 'test value' },
                path: 'test/path',
                statusCode: 200,
                tags: ['tag1', 'tag2'],
            };
            const result = await service.raw(loggerCreateRawDto);

            expect(repository.create).toHaveBeenCalledWith(loggerCreateRawDto);
            expect(result).toEqual({ id: '123' });
        });
    });
});
