import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import configs from 'src/configs';

describe('HelperNumberService', () => {
    let helperNumberService: HelperNumberService;

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

        helperNumberService =
            moduleRef.get<HelperNumberService>(HelperNumberService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperNumberService).toBeDefined();
    });

    describe('check', () => {
        it('should be success', async () => {
            const result: boolean = helperNumberService.check('111');

            jest.spyOn(helperNumberService, 'check').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('create', () => {
        it('should be success', async () => {
            const result: number = helperNumberService.create('111');

            jest.spyOn(helperNumberService, 'create').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(111);
        });
    });

    describe('random', () => {
        it('should be success', async () => {
            const result: number = helperNumberService.random(10);

            jest.spyOn(helperNumberService, 'random').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('randomInRange', () => {
        it('should be success', async () => {
            const result: number = helperNumberService.randomInRange(5, 8);

            jest.spyOn(
                helperNumberService,
                'randomInRange'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });
});
