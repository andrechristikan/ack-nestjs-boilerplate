import type { INestApplication } from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';

import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet } from '@test/e2e/support/request';
import { withDefaultApiKey } from '@test/e2e/support/api-key';

describe('GET /api/v1/public/term-policy/list', () => {
    const getApp = useE2eApp();
    let app: INestApplication;

    beforeAll(() => {
        app = getApp();
    });

    it('returns a cursor-paginated envelope of the published term policies with a valid API key', async () => {
        const response = await withDefaultApiKey(
            e2eGet(app, '/api/v1/public/term-policy/list')
        ).expect(200);

        expect(response.body).toMatchObject({
            statusCode: 200,
            message: expect.any(String),
            metadata: expect.objectContaining({
                type: 'cursor',
            }),
            data: expect.any(Array),
        });

        for (const item of response.body.data) {
            expect(item).toMatchObject({
                id: expect.any(String),
                type: expect.any(String),
                status: 'published',
            });
        }
    });

    it('rejects a request with no x-api-key header', async () => {
        const response = await e2eGet(
            app,
            '/api/v1/public/term-policy/list'
        ).expect(401);

        expect(response.body).toMatchObject({
            module: 'apiKey',
            statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
            statusCodeKey:
                EnumApiKeyStatusCodeError[
                    EnumApiKeyStatusCodeError.xApiKeyRequired
                ],
        });
    });

    it('rejects a request with a malformed x-api-key header', async () => {
        const response = await e2eGet(app, '/api/v1/public/term-policy/list')
            .set('x-api-key', 'not-a-valid-key-pair')
            .expect(401);

        expect(response.body).toMatchObject({
            module: 'apiKey',
            statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            statusCodeKey:
                EnumApiKeyStatusCodeError[
                    EnumApiKeyStatusCodeError.xApiKeyInvalid
                ],
        });
    });
});
