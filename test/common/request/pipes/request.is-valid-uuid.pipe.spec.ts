import { beforeEach, describe, expect, it } from 'vitest';
import { ArgumentMetadata } from '@nestjs/common';
import { RequestIsUuidException } from '@common/request/exceptions/request.is-uuid.exception';
import { RequestIsValidUuidPipe } from '@common/request/pipes/request.is-valid-uuid.pipe';

describe('RequestIsValidUuidPipe', () => {
    const metadata = {
        data: 'userId',
    } as ArgumentMetadata;

    let pipe: RequestIsValidUuidPipe;

    beforeEach(() => {
        pipe = new RequestIsValidUuidPipe();
    });

    it('returns the value when it is a UUID', async () => {
        await expect(
            pipe.transform('018f8a92-1d4b-7b31-a63a-f8ad45ef197b', metadata)
        ).resolves.toBe('018f8a92-1d4b-7b31-a63a-f8ad45ef197b');
    });

    it('throws when the value is not a UUID', async () => {
        await expect(
            pipe.transform('not-a-uuid', metadata)
        ).rejects.toBeInstanceOf(RequestIsUuidException);
    });

    it('throws when the value is empty', async () => {
        await expect(pipe.transform('', metadata)).rejects.toBeInstanceOf(
            RequestIsUuidException
        );
    });
});
