import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { ENUM_APP_ENVIRONMENT } from 'src/app/constants/app.enum.constant';

describe('DatabaseOptionsService', () => {
    let service: DatabaseOptionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseOptionsService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'app.env':
                                    return ENUM_APP_ENVIRONMENT.PRODUCTION;
                                case 'database.host':
                                    return 'mongodb://localhost:27017';
                                case 'database.name':
                                    return 'test-db';
                                case 'database.user':
                                    return 'test-user';
                                case 'database.password':
                                    return 'test-password';
                                case 'database.debug':
                                    return false;
                                case 'database.options':
                                default:
                                    return 'retryWrites=true&w=majority';
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<DatabaseOptionsService>(DatabaseOptionsService);
    });

    afterEach(async () => {
        await mongoose.disconnect();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createOptions', () => {
        it('should return the correct MongooseModuleOptions object with full options', async () => {
            const options = service.createOptions();

            expect(options).toMatchObject({
                uri: 'mongodb://localhost:27017/test-db?retryWrites=true&w=majority',
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                autoCreate: true,
            });

            expect(options.auth).toEqual({
                username: 'test-user',
                password: 'test-password',
            });

            expect(mongoose.get('debug')).toBeUndefined();
        });

        it('should return the correct MongooseModuleOptions object', async () => {
            jest.spyOn(service['configService'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case 'app.env':
                            return ENUM_APP_ENVIRONMENT.DEVELOPMENT;
                        case 'database.host':
                            return 'mongodb://localhost:27017';
                        case 'database.name':
                            return 'test-db';
                        case 'database.debug':
                            return true;
                        case 'database.options':
                        default:
                            return undefined;
                    }
                }
            );

            const options = service.createOptions();

            expect(options).toMatchObject({
                uri: 'mongodb://localhost:27017/test-db',
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                autoCreate: true,
            });

            expect(mongoose.get('debug')).toBe(true);
        });
    });
});
