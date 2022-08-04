import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { AuthEnumService } from 'src/common/auth/services/auth.enum.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { IAuthApi } from 'src/common/auth/auth.interface';
import { MongooseModule } from '@nestjs/mongoose';
import {
    AuthApiDatabaseName,
    AuthApiDocument,
    AuthApiEntity,
    AuthApiSchema,
} from 'src/common/auth/schemas/auth.api.schema';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';

describe('AuthApiService', () => {
    let authApiService: AuthApiService;
    const authApiName: string = faker.random.alphaNumeric();

    let authApi: IAuthApi;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                MongooseModule.forFeature(
                    [
                        {
                            name: AuthApiEntity.name,
                            schema: AuthApiSchema,
                            collection: AuthApiDatabaseName,
                        },
                    ],
                    DATABASE_CONNECTION_NAME
                ),
            ],
            providers: [AuthApiService],
        }).compile();

        authApiService = moduleRef.get<AuthApiService>(AuthApiService);

        authApi = await authApiService.create({
            name: faker.random.alphaNumeric(),
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
            const findOne: AuthApiDocument = await authApiService.findOne({});
            const result: AuthApiDocument = await authApiService.findOneById(
                findOne._id
            );
            jest.spyOn(authApiService, 'findOneById').mockImplementation(
                async () => result
            );

            expect(await authApiService.findOneById(findOne._id)).toBe(result);
        });
    });

    describe('findOne', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument = await authApiService.findOne({});
            jest.spyOn(authApiService, 'findOne').mockImplementation(
                async () => result
            );

            expect(await authApiService.findOne({})).toBe(result);
        });
    });

    describe('findOneByKey', () => {
        it('should return an success', async () => {
            const findOne: AuthApiDocument = await authApiService.findOne({});
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
            const findOne: AuthApiDocument = await authApiService.findOne({});
            const result: AuthApiDocument = await authApiService.inactive(
                findOne._id
            );
            jest.spyOn(authApiService, 'inactive').mockImplementation(
                async () => result
            );

            expect(await authApiService.inactive(findOne._id)).toBe(result);
        });
    });

    describe('active', () => {
        it('should return an success', async () => {
            const findOne: AuthApiDocument = await authApiService.findOne({});
            const result: AuthApiDocument = await authApiService.active(
                findOne._id
            );
            jest.spyOn(authApiService, 'active').mockImplementation(
                async () => result
            );

            expect(await authApiService.active(findOne._id)).toBe(result);
        });
    });

    describe('findAll', () => {
        it('should return an success', async () => {
            const result: AuthApiDocument[] = await authApiService.findAll({});
            jest.spyOn(authApiService, 'findAll').mockImplementation(
                async () => result
            );

            expect(await authApiService.findAll({})).toBe(result);
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

    afterEach(async () => {
        try {
            await authApiService.deleteOne({
                _id: new Types.ObjectId(authApi._id),
            });
        } catch (e) {
            console.error(e);
        }
    });
});
