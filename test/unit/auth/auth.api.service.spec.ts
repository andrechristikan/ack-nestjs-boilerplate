import { Test } from '@nestjs/testing';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { AuthApiDocument } from 'src/common/auth/schemas/auth.api.schema';
import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { AuthApiBulkService } from 'src/common/auth/services/auth.api.bulk.service';
import {
    IAuthApi,
    IAuthApiRequestHashedData,
} from 'src/common/auth/interfaces/auth.interface';
import { AuthApiModule } from 'src/common/auth/auth.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { DatabaseModule } from 'src/common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import configs from 'src/configs';

describe('AuthApiService', () => {
    let authApiService: AuthApiService;
    let authApiBulkService: AuthApiBulkService;
    const authApiName: string = faker.random.alphaNumeric(5);

    let authApi: IAuthApi;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                DatabaseModule,
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                AuthApiModule,
            ],
            providers: [],
        }).compile();

        authApiService = moduleRef.get<AuthApiService>(AuthApiService);
        authApiBulkService =
            moduleRef.get<AuthApiBulkService>(AuthApiBulkService);

        authApi = await authApiService.create({
            name: authApiName,
            description: faker.random.alphaNumeric(),
        });
    });

    describe('create', () => {
        it('should return an success', async () => {
            const data = {
                name: authApiName,
                description: faker.random.alphaNumeric(),
            };

            const result: IAuthApi = await authApiService.create(data);
            jest.spyOn(authApiService, 'create').mockImplementation(
                async () => result
            );

            expect(await authApiService.create(data)).toBe(result);
        });
    });

    describe('createRaw', () => {
        it('should return an success', async () => {
            const data = {
                name: authApiName,
                description: faker.random.alphaNumeric(),
                key: await authApiService.createKey(),
                secret: await authApiService.createSecret(),
                passphrase: await authApiService.createPassphrase(),
                encryptionKey: await authApiService.createEncryptionKey(),
            };

            const result: IAuthApi = await authApiService.createRaw(data);
            jest.spyOn(authApiService, 'createRaw').mockImplementation(
                async () => result
            );

            expect(await authApiService.createRaw(data)).toBe(result);
        });
    });

    describe('getTotal', () => {
        it('should return an success', async () => {
            const result: number = await authApiService.getTotal({});
            jest.spyOn(authApiService, 'getTotal').mockImplementation(
                async () => result
            );

            expect(await authApiService.getTotal({})).toBe(result);
        });
    });

    describe('findOneById', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.findOneById(
                `${authApi._id}`
            );
            jest.spyOn(authApiService, 'findOneById').mockImplementation(
                async () => result
            );

            expect(await authApiService.findOneById(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('findOne', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.findOne({
                _id: authApi._id,
            });
            jest.spyOn(authApiService, 'findOne').mockImplementation(
                async () => result
            );

            expect(await authApiService.findOne({ _id: authApi._id })).toBe(
                result
            );
        });
    });

    describe('findOneByKey', () => {
        it('should return an success', async () => {
            const findOne: AuthApiDocument = await authApiService.findOneById(
                `${authApi._id}`
            );
            const result: AuthApiDocument = await authApiService.findOneByKey(
                findOne.key
            );
            jest.spyOn(authApiService, 'findOneByKey').mockImplementation(
                async () => result
            );

            expect(await authApiService.findOneByKey(findOne.key)).toBe(result);
        });
    });

    describe('inactive', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.inactive(
                `${authApi._id}`
            );
            jest.spyOn(authApiService, 'inactive').mockImplementation(
                async () => result
            );

            expect(await authApiService.inactive(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('active', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.active(
                `${authApi._id}`
            );
            jest.spyOn(authApiService, 'active').mockImplementation(
                async () => result
            );

            expect(await authApiService.active(`${authApi._id}`)).toBe(result);
        });
    });

    describe('findAll', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument[] = await authApiService.findAll(
                {},
                { limit: 1, skip: 1 }
            );
            jest.spyOn(authApiService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.findAll({}, { limit: 1, skip: 1 })
            ).toBe(result);
        });

        it('should return an success with limit and offset', async () => {
            const result: AuthApiDocument[] = await authApiService.findAll(
                {},
                { limit: 1, skip: 1 }
            );
            jest.spyOn(authApiService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.findAll({}, { limit: 1, skip: 1 })
            ).toBe(result);
        });

        it('should return an success with limit, offset, and sort', async () => {
            const result: AuthApiDocument[] = await authApiService.findAll(
                {},
                { limit: 1, skip: 1, sort: { name: 1 } }
            );
            jest.spyOn(authApiService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.findAll(
                    {},
                    { limit: 1, skip: 1, sort: { name: 1 } }
                )
            ).toBe(result);
        });
    });

    describe('updateOneById', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.updateOneById(
                `${authApi._id}`,
                {
                    name: faker.random.alphaNumeric(10),
                    description: faker.random.alphaNumeric(20),
                }
            );
            jest.spyOn(authApiService, 'updateOneById').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.updateOneById(`${authApi._id}`, {
                    name: faker.random.alphaNumeric(10),
                    description: faker.random.alphaNumeric(20),
                })
            ).toBe(result);
        });
    });

    describe('updateHashById', () => {
        it('should return an success', async () => {
            const result: IAuthApi = await authApiService.updateHashById(
                `${authApi._id}`
            );
            jest.spyOn(authApiService, 'updateHashById').mockImplementation(
                async () => result
            );

            expect(await authApiService.updateHashById(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('deleteOneById', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.deleteOneById(
                `${authApi._id}`
            );
            jest.spyOn(authApiService, 'deleteOneById').mockImplementation(
                async () => result
            );

            expect(await authApiService.deleteOneById(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('deleteOne', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.deleteOne({
                _id: `${authApi._id}`,
            });
            jest.spyOn(authApiService, 'deleteOne').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.deleteOne({ _id: `${authApi._id}` })
            ).toBe(result);
        });
    });

    describe('createKey', () => {
        it('should return an success', async () => {
            const result: string = await authApiService.createKey();
            jest.spyOn(authApiService, 'createKey').mockImplementation(
                async () => result
            );

            expect(await authApiService.createKey()).toBe(result);
        });
    });

    describe('createEncryptionKey', () => {
        it('should return an success', async () => {
            const result: string = await authApiService.createEncryptionKey();
            jest.spyOn(
                authApiService,
                'createEncryptionKey'
            ).mockImplementation(async () => result);

            expect(await authApiService.createEncryptionKey()).toBe(result);
        });
    });

    describe('createSecret', () => {
        it('should return an success', async () => {
            const result: string = await authApiService.createSecret();
            jest.spyOn(authApiService, 'createSecret').mockImplementation(
                async () => result
            );

            expect(await authApiService.createSecret()).toBe(result);
        });
    });

    describe('createPassphrase', () => {
        it('should return an success', async () => {
            const result: string = await authApiService.createPassphrase();
            jest.spyOn(authApiService, 'createPassphrase').mockImplementation(
                async () => result
            );

            expect(await authApiService.createPassphrase()).toBe(result);
        });
    });

    describe('createHashApiKey', () => {
        it('should return an success', async () => {
            const key = faker.random.alpha(5);
            const secret = faker.random.alpha(10);
            const result: string = await authApiService.createHashApiKey(
                key,
                secret
            );
            jest.spyOn(authApiService, 'createHashApiKey').mockImplementation(
                async () => result
            );

            expect(await authApiService.createHashApiKey(key, secret)).toBe(
                result
            );
        });
    });

    describe('validateHashApiKey', () => {
        it('should return an success', async () => {
            const findOne: AuthApiDocument = await authApiService.findOneById(
                `${authApi._id}`
            );
            const hashFormRequest = findOne.hash;
            const result: boolean = await authApiService.validateHashApiKey(
                hashFormRequest,
                hashFormRequest
            );
            jest.spyOn(authApiService, 'validateHashApiKey').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.validateHashApiKey(
                    hashFormRequest,
                    hashFormRequest
                )
            ).toBe(result);
        });

        it('should return an failed', async () => {
            const findOne: AuthApiDocument = await authApiService.findOneById(
                `${authApi._id}`
            );
            const hashFormRequest = findOne.hash;
            const hashWrong = faker.random.alphaNumeric(10);
            const result: boolean = await authApiService.validateHashApiKey(
                hashFormRequest,
                hashWrong
            );
            jest.spyOn(authApiService, 'validateHashApiKey').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.validateHashApiKey(
                    hashFormRequest,
                    hashWrong
                )
            ).toBe(result);
        });
    });

    describe('decryptApiKey', () => {
        it('should return an success', async () => {
            const findOne: AuthApiDocument = await authApiService.findOneById(
                `${authApi._id}`
            );
            const timestamp = new Date().valueOf();
            const apiHash = await authApiService.createHashApiKey(
                findOne.key,
                authApi.secret
            );
            const encryptedApiKey: string = await authApiService.encryptApiKey(
                {
                    key: findOne.key,
                    timestamp,
                    hash: apiHash,
                },
                findOne.encryptionKey,
                authApi.passphrase
            );

            const result: IAuthApiRequestHashedData =
                await authApiService.decryptApiKey(
                    encryptedApiKey,
                    findOne.encryptionKey,
                    authApi.passphrase
                );

            jest.spyOn(authApiService, 'decryptApiKey').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.decryptApiKey(
                    encryptedApiKey,
                    findOne.encryptionKey,
                    authApi.passphrase
                )
            ).toBe(result);
        });
    });

    describe('encryptApiKey', () => {
        it('should return an success', async () => {
            const findOne: AuthApiDocument = await authApiService.findOneById(
                `${authApi._id}`
            );
            const timestamp = new Date().valueOf();
            const apiHash = await authApiService.createHashApiKey(
                findOne.key,
                authApi.secret
            );
            const result: string = await authApiService.encryptApiKey(
                {
                    key: findOne.key,
                    timestamp,
                    hash: apiHash,
                },
                findOne.encryptionKey,
                authApi.passphrase
            );
            jest.spyOn(authApiService, 'encryptApiKey').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.encryptApiKey(
                    {
                        key: findOne.key,
                        timestamp,
                        hash: apiHash,
                    },
                    findOne.encryptionKey,
                    authApi.passphrase
                )
            ).toBe(result);
        });
    });

    describe('createBasicToken', () => {
        it('should return an success', async () => {
            const clientId = faker.random.alphaNumeric(10);
            const clientSecret = faker.random.alphaNumeric(10);
            const result: string = await authApiService.createBasicToken(
                clientId,
                clientSecret
            );
            jest.spyOn(authApiService, 'createBasicToken').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.createBasicToken(clientId, clientSecret)
            ).toBe(result);
        });
    });

    describe('validateBasicToken', () => {
        it('should return an success', async () => {
            const clientId = faker.random.alphaNumeric(10);
            const clientSecret = faker.random.alphaNumeric(10);
            const basicToken: string = await authApiService.createBasicToken(
                clientId,
                clientSecret
            );
            const result: boolean = await authApiService.validateBasicToken(
                basicToken,
                basicToken
            );
            jest.spyOn(authApiService, 'validateBasicToken').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.validateBasicToken(basicToken, basicToken)
            ).toBe(result);
        });

        it('should return an failed', async () => {
            const clientId = faker.random.alphaNumeric(10);
            const clientSecret = faker.random.alphaNumeric(10);
            const clientSecret2 = faker.random.alphaNumeric(10);
            const basicToken: string = await authApiService.createBasicToken(
                clientId,
                clientSecret
            );
            const result: boolean = await authApiService.validateBasicToken(
                basicToken,
                clientSecret2
            );
            jest.spyOn(authApiService, 'validateBasicToken').mockImplementation(
                async () => result
            );

            expect(
                await authApiService.validateBasicToken(
                    basicToken,
                    clientSecret2
                )
            ).toBe(result);
        });
    });

    afterEach(async () => {
        try {
            await authApiService.deleteOne({
                _id: new Types.ObjectId(authApi._id),
            });
            await authApiBulkService.deleteMany({
                name: authApiName,
            });
        } catch (e) {
            console.error(e);
        }
    });
});
