import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eDelete, e2eGet, e2ePost } from '@test/e2e/support/request';
import { loginActiveUser, withSharedAuth } from '@test/e2e/support/auth';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    deleteUserFixture,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';

describe('Device shared routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/shared/user/device/list', () => {
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

        it("returns a paginated cursor list of the authenticated user's device ownerships", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/device/list'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: expect.any(Array),
                metadata: expect.objectContaining({
                    type: 'cursor',
                }),
            });
            // the credential login that produced `accessToken` itself creates the device ownership
            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/v1/shared/user/device/refresh', () => {
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

        it('refreshes the current device and persists the new details', async () => {
            const prisma = getPrismaClient(app);
            const session = await prisma.session.findFirstOrThrow({
                where: { userId: user.id, isRevoked: false },
                include: { deviceOwnership: true },
            });
            const before = session.deviceOwnership;

            await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/device/refresh'),
                accessToken
            )
                .send({
                    name: 'E2E refreshed device name',
                    platform: 'ios',
                    notificationToken: 'e2e-refreshed-token',
                })
                .expect(200);

            const device = await prisma.device.findUniqueOrThrow({
                where: { id: before.deviceId },
            });
            expect(device).toMatchObject({
                name: 'E2E refreshed device name',
                platform: 'ios',
                notificationToken: 'e2e-refreshed-token',
            });
            expect(device.notificationProvider).not.toBeNull();
            const ownership = await prisma.deviceOwnership.findUniqueOrThrow({
                where: { id: before.id },
            });
            expect(ownership.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
                before.lastActiveAt.getTime()
            );
        });

        it('rejects an invalid device payload as a validation failure', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/device/refresh'),
                accessToken
            )
                .send({ platform: 'not-a-real-platform' })
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

    describe('DELETE /api/v1/shared/user/device/remove/:deviceOwnershipId', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('removes the device ownership and persists the deletion', async () => {
            // its own login — `remove` also revokes every session tied to the device
            // ownership, including the one behind the access token used to call it
            const { accessToken } = await loginActiveUser(app, user);

            const list = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/device/list'),
                accessToken
            ).expect(200);
            const deviceOwnershipId = list.body.data[0].id as string;

            await withSharedAuth(
                e2eDelete(
                    app,
                    `/api/v1/shared/user/device/remove/${deviceOwnershipId}`
                ),
                accessToken
            ).expect(200);

            // `DeviceSharedController#remove` calls `DeviceHttpService.remove`, which soft-deletes
            // via `DeviceDomain.remove` (revoke) rather than hard-deleting the row — the ownership
            // row stays, flagged `isRevoked`.
            const prisma = getPrismaClient(app);
            const persisted = await prisma.deviceOwnership.findUniqueOrThrow({
                where: { id: deviceOwnershipId },
            });
            expect(persisted).toMatchObject({
                isRevoked: true,
                revokedAt: expect.any(Date),
                revokedById: expect.any(String),
            });
        });

        it('404s for a device ownership id that does not belong to the user', async () => {
            const { accessToken } = await loginActiveUser(app, user);

            const response = await withSharedAuth(
                e2eDelete(
                    app,
                    '/api/v1/shared/user/device/remove/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e'
                ),
                accessToken
            ).expect(404);

            expect(response.body).toMatchObject({
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
                statusCodeKey:
                    EnumDeviceStatusCodeError[
                        EnumDeviceStatusCodeError.notFound
                    ],
            });
        });
    });
});
