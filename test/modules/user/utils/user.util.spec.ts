import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EnumActivityLogAction,
    EnumUserLoginWith,
    type TwoFactor,
    type TwoFactorBackupCode,
} from '@generated/prisma-client';
import type { IUserTwoFactor } from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { ConfigService } from '@nestjs/config';

describe('UserUtil', () => {
    let configService: ConfigService;
    let util: UserUtil;

    beforeEach(() => {
        vi.resetAllMocks();
        configService = new ConfigService({
            user: { usernamePattern: /^[a-z0-9-]+$/ },
            message: { availableLanguage: ['en'] },
        });
        util = new UserUtil(configService);
    });

    it('rejects usernames outside the configured pattern', () => {
        expect(util.checkUsernamePattern('valid-name')).toBe(false);
        expect(util.checkUsernamePattern('Invalid Name')).toBe(true);
    });

    it('detects profanity and accepts clean text', async () => {
        await expect(util.checkBadWord('fuck')).resolves.toBe(true);
        await expect(util.checkBadWord('professional')).resolves.toBe(false);
    });

    it('maps pending two-factor state without exposing credentials', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const twoFactor = {
            id: 'two-factor-id',
            userId: 'user-id',
            secret: 'encrypted-secret',
            pendingSecret: 'encrypted-pending-secret',
            enabled: false,
            requiredSetup: false,
            confirmedAt: null,
            lastUsedAt: null,
            attempt: 0,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            backupCodes: [
                {
                    id: 'backup-id',
                    twoFactorId: 'two-factor-id',
                    codeHash: 'hash',
                    usedAt: null,
                    createdAt: now,
                } satisfies TwoFactorBackupCode,
            ],
        } satisfies TwoFactor & IUserTwoFactor;

        expect(util.mapTwoFactor(twoFactor)).toEqual({
            isEnabled: false,
            isPendingConfirmation: true,
            backupCodesRemaining: 1,
            confirmedAt: null,
            lastUsedAt: null,
        });
    });

    it.each([
        [EnumUserLoginWith.socialApple, EnumActivityLogAction.userLoginApple],
        [EnumUserLoginWith.socialGoogle, EnumActivityLogAction.userLoginGoogle],
        [
            EnumUserLoginWith.credential,
            EnumActivityLogAction.userLoginCredential,
        ],
    ])('maps login methods to activity actions', (method, action) => {
        expect(util.resolveLoginActivityLogAction(method)).toBe(action);
    });
});
