import { Test } from '@nestjs/testing';
import { AuthEnumService } from 'src/common/auth/services/auth.enum.service';
import { AuthModule } from 'src/common/auth/auth.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { ConfigModule } from '@nestjs/config';
import configs from 'src/configs';

describe('AuthEnumService', () => {
    let authEnumService: AuthEnumService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                AuthModule,
            ],
            providers: [],
        }).compile();

        authEnumService = moduleRef.get<AuthEnumService>(AuthEnumService);
    });

    it('should be defined', async () => {
        expect(authEnumService).toBeDefined();
    });

    describe('getAccessFor', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authEnumService, 'getAccessFor');

            await authEnumService.getAccessFor();
            expect(test).toHaveBeenCalled();
        });

        it('should be mapped', async () => {
            const accessFor = await authEnumService.getAccessFor();
            jest.spyOn(authEnumService, 'getAccessFor').mockImplementation(
                async () => accessFor
            );

            expect(await authEnumService.getAccessFor()).toBe(accessFor);
        });
    });
});
