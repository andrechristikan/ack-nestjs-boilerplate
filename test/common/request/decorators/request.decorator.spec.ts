import { SetMetadata } from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from 'src/common/request/constants/request.constant';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';

jest.mock('@nestjs/common', () => ({
    ...jest.requireActual('@nestjs/common'),
    SetMetadata: jest.fn(),
}));

describe('Request Decorators', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('RequestTimeout', () => {
        it('Should return applyDecorators with property', async () => {
            const result = RequestTimeout('2s');

            expect(result).toBeTruthy();
            expect(SetMetadata).toHaveBeenCalledWith(
                REQUEST_CUSTOM_TIMEOUT_META_KEY,
                true
            );
            expect(SetMetadata).toHaveBeenCalledWith(
                REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
                '2s'
            );
        });

        it('Should return applyDecorators', async () => {
            expect(RequestTimeout('2s')).toBeTruthy();
        });
    });
});
