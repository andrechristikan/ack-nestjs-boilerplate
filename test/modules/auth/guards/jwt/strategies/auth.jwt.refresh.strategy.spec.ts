import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthJwtRefreshStrategy } from 'src/modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';

describe('AuthJwtRefreshStrategy', () => {
    let strategy: AuthJwtRefreshStrategy;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtRefreshStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            const config = {
                                'auth.jwt.prefixAuthorization': 'Bearer',
                                'auth.jwt.audience': 'your-audience',
                                'auth.jwt.issuer': 'your-issuer',
                                'auth.jwt.refreshToken.secretKey':
                                    'your-secret-key',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        strategy = module.get<AuthJwtRefreshStrategy>(AuthJwtRefreshStrategy);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    it('should validate and return the payload', async () => {
        const payload: AuthJwtRefreshPayloadDto = {
            _id: 'test-id',
            loginFrom: ENUM_AUTH_LOGIN_FROM.SOCIAL_GOOGLE,
            loginDate: new Date(),
        };
        const result = await strategy.validate(payload);
        expect(result).toEqual(payload);
    });

    it('should get correct config values', () => {
        expect(configService.get<string>('auth.jwt.prefixAuthorization')).toBe(
            'Bearer'
        );
        expect(configService.get<string>('auth.jwt.audience')).toBe(
            'your-audience'
        );
        expect(configService.get<string>('auth.jwt.issuer')).toBe(
            'your-issuer'
        );
        expect(
            configService.get<string>('auth.jwt.refreshToken.secretKey')
        ).toBe('your-secret-key');
    });
});
