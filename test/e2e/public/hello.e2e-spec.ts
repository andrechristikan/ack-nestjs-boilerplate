import { INestApplication } from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';

import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet } from '@test/e2e/support/request';

describe('Public HTTP endpoints', () => {
    const getApp = useE2eApp();
    let app: INestApplication;

    beforeAll(() => {
        app = getApp();
    });

    it('GET /api/public/hello returns the standard response envelope', async () => {
        const response = await e2eGet(app, '/api/public/hello').expect(200);
        expect(response.body).toMatchObject({
            message: expect.any(String),
            data: {
                app: expect.any(Object),
                date: {
                    iso: expect.any(String),
                    timestamp: expect.any(Number),
                },
                message: {
                    availableLanguage: expect.any(Array),
                    defaultLanguage: expect.any(String),
                },
            },
        });
    });
});
