import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { HelperAppleService } from 'src/common/helper/services/helper.apple.service';

describe('HelperAppleService', () => {
    let service: HelperAppleService;

    beforeEach(async () => {
        const mockJwtService = {
            sign: jest.fn().mockReturnValue('mockedToken'),
            decode: jest.fn().mockReturnValue({ text: 'mockedData' }),
            verify: jest.fn().mockImplementation((token: string) => {
                if (token === 'AValidJwtTokenForTestingPurposes') return true;
                throw Error();
            }),
        };

        const mockConfigService = {
            get: jest.fn().mockImplementation((path: string) => {
                switch (path) {
                    case 'apple.certP8Path':
                    default:
                        return './data/SignInApple_AuthKey.p8';
                }
            }),
        };

        const moduleRefRef = await Test.createTestingModule({
            providers: [
                ConfigService,
                HelperAppleService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = moduleRefRef.get<HelperAppleService>(HelperAppleService);

        jest.spyOn(service['appleClient'], 'accessToken').mockImplementation(
            async () => ({
                access_token: 'mockedData',
                expires_in: 1,
                id_token: '123456',
                refresh_token: '7890',
                token_type: 'bearer',
            })
        );

        jest.spyOn(service['appleClient'], 'refreshToken').mockImplementation(
            async () => ({
                access_token: 'mockedData',
                expires_in: 1,
                id_token: '123456',
                refresh_token: '7890',
                token_type: 'bearer',
            })
        );

        jest.spyOn(service['jwtService'], 'decode').mockImplementation(
            async () => ({
                email: 'mail@mail.com',
            })
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getTokenInfo', () => {
        it('should get info of token from apple api', async () => {
            const result = {
                email: 'mail@mail.com',
            };
            const tokenInfo = await service.getTokenInfo('mockedData');
            expect(tokenInfo).toEqual(result);
        });
    });

    describe('refreshToken', () => {
        it('should refresh access token of apple api', async () => {
            const result = {
                accessToken: 'mockedData',
            };
            const accessToken = await service.refreshToken('mockedData');
            expect(accessToken).toEqual(result);
        });
    });
});
