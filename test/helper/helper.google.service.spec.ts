import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperGoogleService } from 'src/common/helper/services/helper.google.service';

describe('HelperGoogleService', () => {
    let service: HelperGoogleService;

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [ConfigService, HelperGoogleService],
        }).compile();

        service = moduleRefRef.get<HelperGoogleService>(HelperGoogleService);

        jest.spyOn(service['googleClient'], 'getTokenInfo').mockImplementation(
            async () => ({
                email: 'mail@mail.com',
                aud: 'qwerty',
                scopes: [],
                expiry_date: 123456,
            })
        );

        jest.spyOn(
            service['googleClient'],
            'refreshAccessToken'
        ).mockImplementation(async () => ({
            credentials: {
                access_token: 'mockedData',
            },
            res: jest.fn(),
        }));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getTokenInfo', () => {
        it('should get info of token from google api', async () => {
            const result = {
                email: 'mail@mail.com',
            };
            const tokenInfo = await service.getTokenInfo('mockedData');
            expect(tokenInfo).toEqual(result);
        });
    });

    describe('refreshToken', () => {
        it('should refresh access token of google api', async () => {
            const result = {
                accessToken: 'mockedData',
            };
            const accessToken = await service.refreshToken('mockedData');
            expect(accessToken).toEqual(result);
        });
    });
});
