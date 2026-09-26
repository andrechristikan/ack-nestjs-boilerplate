import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet, e2ePatch, e2ePost, e2ePut } from '@test/e2e/support/request';
import { loginActiveUser, withSharedAuth } from '@test/e2e/support/auth';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    deleteUserFixture,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';
import { createNotificationFixture } from '@test/e2e/support/notification.fixture';
import type { Notification } from '@generated/prisma-client';

describe('Notification shared routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/shared/notification/list', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;
        let notification: Notification;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
            notification = await createNotificationFixture(app, user.id);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it("returns a paginated cursor list of the authenticated user's notifications", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/notification/list'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: expect.any(Array),
                metadata: expect.objectContaining({
                    type: 'cursor',
                }),
            });
            expect(
                response.body.data.some(
                    (entry: { id: string }) => entry.id === notification.id
                )
            ).toBe(true);
        });
    });

    describe('GET /api/v1/shared/notification/setting/list', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it("returns the authenticated user's notification settings", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/notification/setting/list'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    settings: expect.any(Array),
                },
            });
        });
    });

    describe('PATCH /api/v1/shared/notification/update/:notificationId/read', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('marks the notification as read and persists the state', async () => {
            const notification = await createNotificationFixture(app, user.id);

            await withSharedAuth(
                e2ePatch(
                    app,
                    `/api/v1/shared/notification/update/${notification.id}/read`
                ),
                accessToken
            ).expect(200);

            const prisma = getPrismaClient(app);
            const persisted = await prisma.notification.findUniqueOrThrow({
                where: { id: notification.id },
            });
            expect(persisted.isRead).toBe(true);
            expect(persisted.readAt).not.toBeNull();
        });

        it('404s for a notification id that does not belong to the user', async () => {
            const response = await withSharedAuth(
                e2ePatch(
                    app,
                    '/api/v1/shared/notification/update/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e/read'
                ),
                accessToken
            ).expect(404);

            expect(response.body).toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.notFound,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.notFound
                    ],
            });
        });
    });

    describe('POST /api/v1/shared/notification/update/read', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('marks all notifications as read and persists the state', async () => {
            const [first, second] = await Promise.all([
                createNotificationFixture(app, user.id),
                createNotificationFixture(app, user.id),
            ]);

            await withSharedAuth(
                e2ePost(app, '/api/v1/shared/notification/update/read'),
                accessToken
            ).expect(200);

            const prisma = getPrismaClient(app);
            const persisted = await prisma.notification.findMany({
                where: { id: { in: [first.id, second.id] } },
            });
            expect(persisted.every(entry => entry.isRead)).toBe(true);
        });
    });

    describe('PUT /api/v1/shared/notification/setting/update', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
            // `NotificationUserSettingRepository.updateUserSettingInTx` is a plain `update`, not
            // an `upsert` — it 500s unless a row already exists. Every real onboarding flow
            // seeds one row per channel/type through `NotificationDomain.createDefaultsInTx`;
            // `createActiveUser` bypasses onboarding (a raw Prisma insert, like every other
            // fixture in this file), so this row is seeded directly here too.
            await getPrismaClient(app).notificationUserSetting.create({
                data: {
                    userId: user.id,
                    channel: 'email',
                    type: 'userActivity',
                    isActive: true,
                    createdBy: user.id,
                },
            });
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('updates the notification settings and persists the change', async () => {
            await withSharedAuth(
                e2ePut(app, '/api/v1/shared/notification/setting/update'),
                accessToken
            )
                .send({
                    channel: 'email',
                    type: 'userActivity',
                    isActive: false,
                })
                .expect(200);

            const prisma = getPrismaClient(app);
            const persisted =
                await prisma.notificationUserSetting.findFirstOrThrow({
                    where: {
                        userId: user.id,
                        channel: 'email',
                        type: 'userActivity',
                    },
                });
            expect(persisted.isActive).toBe(false);
        });

        it('rejects an invalid payload as a validation failure', async () => {
            const response = await withSharedAuth(
                e2ePut(app, '/api/v1/shared/notification/setting/update'),
                accessToken
            )
                .send({
                    channel: 'email',
                    type: 'userActivity',
                    isActive: false,
                    unknownField: 'not-allowed',
                })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
            });
        });
    });
});
