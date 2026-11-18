import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const activityLog = JSON.parse(
    readFileSync(
        resolve(process.cwd(), 'src/languages/en/activityLog.json'),
        'utf8'
    )
) as Record<string, unknown>;

describe('ActivityLogActionContract mobile number verification', () => {
    it.each([
        'userSendVerificationMobileNumber',
        'userVerifiedMobileNumber',
    ] as const)('has a row and an en key for %s', action => {
        expect(
            ActivityLogActionContract[EnumActivityLogAction[action]]
        ).toBeDefined();
        expect(Object.keys(activityLog)).toContain(action);
    });
});
