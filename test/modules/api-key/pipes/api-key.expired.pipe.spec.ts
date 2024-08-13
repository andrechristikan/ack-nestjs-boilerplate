import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiKeyNotExpiredPipe } from 'src/modules/api-key/pipes/api-key.expired.pipe';
import { ApiKeyDoc } from 'src/modules/api-key/repository/entities/api-key.entity';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';

const mockHelperDateService = {
    create: jest.fn(),
};

describe('ApiKeyNotExpiredPipe', () => {
    let pipe: ApiKeyNotExpiredPipe;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                ApiKeyNotExpiredPipe,
                {
                    provide: HelperDateService,
                    useValue: mockHelperDateService,
                },
            ],
        }).compile();

        pipe = moduleRef.get<ApiKeyNotExpiredPipe>(ApiKeyNotExpiredPipe);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    describe('transform', () => {
        it('should be success transform', async () => {
            expect(await pipe.transform({} as ApiKeyDoc)).toEqual({});
        });

        it('should be throw error', async () => {
            const today = new Date('2024-07-12');
            const value = {
                startDate: new Date('1900-01-01'),
                endDate: new Date('1900-01-01'),
            };

            mockHelperDateService.create.mockReturnValue(today);

            try {
                await pipe.transform(value as ApiKeyDoc);
            } catch (error) {
                expect(error).toBeInstanceOf(BadRequestException);
                expect(error.response).toEqual({
                    statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED,
                    message: 'apiKey.error.expired',
                });
            }
        });
    });
});
