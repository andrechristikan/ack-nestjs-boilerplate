import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    closeE2eApplication,
    createE2eApplication,
} from '@test/e2e/support/app';
import { e2eGet } from '@test/e2e/support/request';

describe('Public HTTP endpoints', () => {
    let app: INestApplication | undefined;

    beforeAll(async () => {
        app = await createE2eApplication();
    });

    afterAll(async () => {
        await closeE2eApplication(app);
    });

    it('GET /api/public/hello returns the standard response envelope', async () => {
        if (!app) {
            throw new Error('E2E application was not initialized');
        }

        const response = await e2eGet(app, '/api/public/hello').expect(200);
        console.log(response.body);
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
