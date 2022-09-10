import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { AuthApiBulkService } from 'src/common/auth/services/auth.api.bulk.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import {
    AuthApiDatabaseName,
    AuthApiEntity,
    AuthApiSchema,
} from 'src/common/auth/schemas/auth.api.schema';
import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { DeleteResult } from 'mongodb';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { IAuthApi } from 'src/common/auth/interfaces/auth.interface';

describe('AuthApiBulkService', () => {
    let authApiBulkService: AuthApiBulkService;
    let authApiService: AuthApiService;

    const authApiName: string = faker.random.alphaNumeric(5);

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
            providers: [AuthApiBulkService, AuthApiService],
        }).compile();

        authApiBulkService =
            moduleRef.get<AuthApiBulkService>(AuthApiBulkService);
        authApiService = moduleRef.get<AuthApiService>(AuthApiService);

        authApi = await authApiService.create({
            name: authApiName,
            description: faker.random.alphaNumeric(),
        });
    });

    it('should be defined', async () => {
        expect(authApiBulkService).toBeDefined();
    });

    describe('deleteMany', () => {
        it('should return an success', async () => {
            const result: DeleteResult = {
                acknowledged: true,
                deletedCount: 1,
            };
            jest.spyOn(authApiBulkService, 'deleteMany').mockImplementation(
                async () => result
            );

            expect(
                await authApiBulkService.deleteMany({
                    _id: new Types.ObjectId(authApi._id),
                })
            ).toBe(result);
        });
    });

    afterEach(async () => {
        try {
            await authApiBulkService.deleteMany({
                _id: new Types.ObjectId(authApi._id),
            });
            await authApiService.deleteOne({
                name: authApiName,
            });
        } catch (e) {
            console.error(e);
        }
    });
});
