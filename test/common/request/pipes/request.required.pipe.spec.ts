import { BadRequestException } from '@nestjs/common';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';

describe('RequestRequiredPipe', () => {
    let pipe: RequestRequiredPipe;

    beforeEach(() => {
        pipe = new RequestRequiredPipe();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    describe('transform', () => {
        it('Should throw a BadRequestException when the field is undefined', async () => {
            try {
                await pipe.transform(undefined);
            } catch (err: any) {
                expect(err).toBeInstanceOf(BadRequestException);
            }
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform('string');

            expect(result).toBeDefined();
        });
    });
});
