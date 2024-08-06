import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyParsePipe } from 'src/modules/api-key/pipes/api-key.parse.pipe';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';

const mockApiKeyService = {
    findOneById: jest.fn(),
};

describe('ApiKeyParsePipe', () => {
    let pipe: ApiKeyParsePipe;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                ApiKeyParsePipe,
                {
                    provide: ApiKeyService,
                    useValue: mockApiKeyService,
                },
            ],
        }).compile();

        pipe = moduleRef.get<ApiKeyParsePipe>(ApiKeyParsePipe);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    describe('transform', () => {
        it('should transform', async () => {
            const result: any = {};

            mockApiKeyService.findOneById.mockReturnValue(result);

            expect(await pipe.transform({})).toBe(result);
        });

        it('should be throw error', async () => {
            mockApiKeyService.findOneById.mockReturnValue(undefined);

            try {
                await pipe.transform({});
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundException);
                expect(error.response).toEqual({
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'apiKey.error.notFound',
                });
            }
        });
    });
});
