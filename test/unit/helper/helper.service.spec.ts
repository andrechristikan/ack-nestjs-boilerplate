import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperService } from 'src/common/helper/services/helper.service';
import configs from 'src/configs';

describe('HelperService', () => {
    let helperService: HelperService;

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
            ],
        }).compile();

        helperService = moduleRef.get<HelperService>(HelperService);
    });

    it('should be defined', () => {
        expect(helperService).toBeDefined();
    });

    describe('check', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperService, 'delay');

            await helperService.delay(100);
            expect(test).toHaveBeenCalledWith(100);
        });

        it('should be success', async () => {
            const result = await helperService.delay(100);
            jest.spyOn(helperService, 'delay').mockImplementation(
                async () => result
            );

            expect(await helperService.delay(100)).toBe(result);
        });
    });
});
