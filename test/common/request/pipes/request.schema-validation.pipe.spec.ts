import type { ArgumentMetadata } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { RequestSchemaMissingException } from '@common/request/exceptions/request.schema-missing.exception';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { RequestSchemaValidationPipe } from '@common/request/pipes/request.schema-validation.pipe';

describe('RequestSchemaValidationPipe', () => {
    const pipe = new RequestSchemaValidationPipe({
        exceptionFactory: issues => new RequestValidationException(issues),
    });

    it('validates and transforms a body through its schema', async () => {
        const metadata: ArgumentMetadata = {
            type: 'body',
            schema: z.strictObject({ count: z.coerce.number().int() }),
        };

        await expect(pipe.transform({ count: '2' }, metadata)).resolves.toEqual(
            { count: 2 }
        );
    });

    it('fails closed when a body has no schema', async () => {
        await expect(
            pipe.transform({ count: 2 }, { type: 'body' })
        ).rejects.toBeInstanceOf(RequestSchemaMissingException);
    });

    it('maps schema issues through the configured validation exception', async () => {
        const metadata: ArgumentMetadata = {
            type: 'body',
            schema: z.strictObject({ count: z.number() }),
        };

        await expect(
            pipe.transform({ count: 'invalid' }, metadata)
        ).rejects.toBeInstanceOf(RequestValidationException);
    });
});
