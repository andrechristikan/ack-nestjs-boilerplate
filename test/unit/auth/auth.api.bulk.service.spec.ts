import { Test } from '@nestjs/testing';
import { AuthApiBulkService } from 'src/common/auth/services/auth.api.bulk.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { IAuthApi } from 'src/common/auth/interfaces/auth.interface';
import { AuthApiModule } from 'src/common/auth/auth.module';
import { DatabaseModule } from 'src/common/database/database.module';
import configs from 'src/configs';
import { ConfigModule } from '@nestjs/config';
import { HelperModule } from 'src/common/helper/helper.module';

describe('AuthApiBulkService', () => {
    let authApiBulkService: AuthApiBulkService;
    let authApiService: AuthApiService;

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
            const result = true;
            jest.spyOn(authApiBulkService, 'deleteMany').mockImplementation(
                async () => result
            );

            expect(
                await authApiBulkService.deleteMany({
                    _id: new DatabasePrimaryKey(authApi._id),
                })
            ).toBe(result);
        });
    });

    afterEach(async () => {
        try {
            await authApiBulkService.deleteMany({
                _id: new DatabasePrimaryKey(authApi._id),
            });
            await authApiService.deleteOne({
                name: authApiName,
            });
        } catch (e) {
            console.error(e);
        }
    });
});
