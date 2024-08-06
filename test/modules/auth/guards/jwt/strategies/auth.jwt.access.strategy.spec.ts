import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtAccessStrategy } from 'src/modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';

describe('AuthJwtAccessStrategy', () => {
    let strategy: AuthJwtAccessStrategy;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtAccessStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            const config = {
                                'auth.jwt.prefixAuthorization': 'Bearer',
                                'auth.jwt.audience': 'your-audience',
                                'auth.jwt.issuer': 'your-issuer',
                                'auth.jwt.accessToken.secretKey':
                                    'your-secret-key',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        strategy = module.get<AuthJwtAccessStrategy>(AuthJwtAccessStrategy);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    it('should validate and return the payload', async () => {
        const payload: AuthJwtAccessPayloadDto = {
            _id: 'test-id',
            type: ENUM_POLICY_ROLE_TYPE.ADMIN,
            role: 'role-id',
            email: 'test@example.com',
            permissions: [
                { action: 'action', subject: ENUM_POLICY_SUBJECT.ALL },
            ],
            loginDate: new Date(),
            loginFrom: ENUM_AUTH_LOGIN_FROM.SOCIAL_GOOGLE,
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
            configService.get<string>('auth.jwt.accessToken.secretKey')
        ).toBe('your-secret-key');
    });
});
