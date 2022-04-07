import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';

describe('ConfigService', () => {
    let configService: ConfigService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
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
