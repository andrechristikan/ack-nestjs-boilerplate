import { BadRequestException } from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyIsActivePipe } from 'src/modules/api-key/pipes/api-key.is-active.pipe';
import { ApiKeyDoc } from 'src/modules/api-key/repository/entities/api-key.entity';

describe('ApiKeyIsActivePipe', () => {
    let pipe: ApiKeyIsActivePipe;

    beforeEach(async () => {
        pipe = new ApiKeyIsActivePipe([true, false]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return the value if isActive is valid', async () => {
        const value = { isActive: true } as ApiKeyDoc;

        await expect(pipe.transform(value)).resolves.toEqual(value);
    });

    it('should throw BadRequestException if isActive is invalid', async () => {
        const value = { isActive: null } as ApiKeyDoc;

        try {
            await pipe.transform(value);
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.response).toEqual({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE,
                message: 'apiKey.error.isActiveInvalid',
            });
        }
    });
});
