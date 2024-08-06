import { faker } from '@faker-js/faker';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { DatabaseService } from 'src/common/database/services/database.service';

jest.mock('mongoose', () => ({
    ...jest.requireActual('mongoose'),
    set: jest.fn(),
}));

describe('DatabaseService', () => {
    describe('Production Environment', () => {
        let service: DatabaseService;
        const databaseUrl = faker.internet.url();

        const mockConfigServiceProduction = {
            get: jest.fn().mockImplementation(e => {
                switch (e) {
                    case 'app.env':
                        return ENUM_APP_ENVIRONMENT.PRODUCTION;
                    case 'database.uri':
                        return databaseUrl;
                    case 'database.debug':
                        return false;
                    case 'database.timeoutOptions':
                        return {};
                    default:
                        return null;
                }
            }),
        };

        beforeEach(async () => {
            const moduleRefRef = await Test.createTestingModule({
                providers: [
                    DatabaseService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigServiceProduction,
                    },
                ],
            }).compile();

            service = moduleRefRef.get<DatabaseService>(DatabaseService);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        describe('createOptions', () => {
            it('should return mongoose options', () => {
                const result = service.createOptions();

                expect(mongoose.set).toHaveBeenCalledTimes(0);
                expect(result).toEqual({
                    uri: databaseUrl,
                    autoCreate: false,
                    autoIndex: false,
                });
            });
        });
    });

    describe('Development Environment', () => {
        let service: DatabaseService;
        const databaseUrl = faker.internet.url();

        const mockConfigServiceDevelopment = {
            get: jest.fn().mockImplementation(e => {
                switch (e) {
                    case 'app.env':
                        return ENUM_APP_ENVIRONMENT.DEVELOPMENT;
                    case 'database.uri':
                        return databaseUrl;
                    case 'database.debug':
                        return true;
                    case 'database.timeoutOptions':
                        return {};
                    default:
                        return null;
                }
            }),
        };

        beforeEach(async () => {
            const moduleRefRef = await Test.createTestingModule({
                providers: [
                    DatabaseService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigServiceDevelopment,
                    },
                ],
            }).compile();

            service = moduleRefRef.get<DatabaseService>(DatabaseService);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        describe('createOptions', () => {
            it('should return mongoose options and debug on', () => {
                const result = service.createOptions();

                expect(mongoose.set).toHaveBeenCalledTimes(1);
                expect(result).toEqual({
                    uri: databaseUrl,
                    autoCreate: false,
                    autoIndex: false,
                });
            });
        });
    });
});
