import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import configs from 'src/configs';

describe('ConfigService', () => {
    let configService: ConfigService;
    let appName: string;

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
            ],
        }).compile();

        configService = moduleRef.get<ConfigService>(ConfigService);

        appName = configService.get<string>('app.env');
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(configService).toBeDefined();
    });

    describe('get', () => {
        it('should be get config value of env', async () => {
            const result: string = configService.get<string>('app.env');

            jest.spyOn(configService, 'get').mockReturnValueOnce(result);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
            expect(result).toBe(appName);
        });
    });
});
