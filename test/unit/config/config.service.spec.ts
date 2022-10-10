import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import configs from 'src/configs';

describe('ConfigService', () => {
    let configService: ConfigService;

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
    });

    it('should be defined', () => {
        expect(configService).toBeDefined();
    });

    describe('get', () => {
        it('should be called', async () => {
            const test = jest.spyOn(configService, 'get');

            configService.get('auth.env');
            expect(test).toHaveBeenCalledWith('auth.env');
        });

        it('should be success', async () => {
            const env = configService.get('app.env');
            jest.spyOn(configService, 'get').mockImplementation(() => env);

            expect(configService.get('app.env')).toBe(env);
        });
    });
});
