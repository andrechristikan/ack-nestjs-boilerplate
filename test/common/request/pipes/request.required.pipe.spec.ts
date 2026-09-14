import type { ArgumentMetadata } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { RequestParamRequiredException } from '@common/request/exceptions/request.param-required.exception';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';

describe('RequestRequiredPipe', () => {
    const pipe = new RequestRequiredPipe();
    const metadata: ArgumentMetadata = {
        type: 'param',
        data: 'userId',
    };

    it('returns a present parameter unchanged', async () => {
        await expect(pipe.transform('user-id', metadata)).resolves.toBe(
            'user-id'
        );
    });

    it('rejects an empty parameter', async () => {
        await expect(pipe.transform('', metadata)).rejects.toBeInstanceOf(
            RequestParamRequiredException
        );
    });
});
