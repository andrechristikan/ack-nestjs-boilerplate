import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { FileService } from '@common/file/services/file.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    type TermPolicyContent,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('TermPolicyDomain', () => {
    const termPolicyRepository = {
        findOneById: vi.fn<TermPolicyRepository['findOneById']>(),
        publishInTx: vi.fn<TermPolicyRepository['publishInTx']>(),
    } satisfies Pick<TermPolicyRepository, 'findOneById' | 'publishInTx'>;
    const awsS3Service = {
        copyItems: vi.fn<AwsS3Service['copyItems']>(),
        deleteDir: vi.fn<AwsS3Service['deleteDir']>(),
    } satisfies Pick<AwsS3Service, 'copyItems' | 'deleteDir'>;
    const termPolicyUtil = {
        getContentPublicPath: vi.fn<TermPolicyUtil['getContentPublicPath']>(),
        getPath: vi.fn<TermPolicyUtil['getPath']>(),
        mapActivityLogMetadata:
            vi.fn<TermPolicyUtil['mapActivityLogMetadata']>(),
    } satisfies Pick<
        TermPolicyUtil,
        'getContentPublicPath' | 'getPath' | 'mapActivityLogMetadata'
    >;
    const notificationQueue = {
        sendPublishTermPolicy:
            vi.fn<NotificationQueue['sendPublishTermPolicy']>(),
    } satisfies Pick<NotificationQueue, 'sendPublishTermPolicy'>;
    const activityLogDomain = {
        prepare: vi.fn<ActivityLogDomain['prepare']>(),
        stagePrepared: vi.fn<ActivityLogDomain['stagePrepared']>(),
    } satisfies Pick<ActivityLogDomain, 'prepare' | 'stagePrepared'>;
    const fileService = {
        extractFilenameFromPath:
            vi.fn<FileService['extractFilenameFromPath']>(),
    } satisfies Pick<FileService, 'extractFilenameFromPath'>;
    const databaseService = createDatabaseServiceMock();
    const userDomain = createMock<UserDomain>();
    const databaseUtil = createMock<DatabaseUtil>();
    const helperDateService = createMock<HelperDateService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const content = {
        id: 'content-id',
        termPolicyId: 'term-id',
        language: EnumMessageLanguage.en,
        bucket: 'private-bucket',
        key: 'private/privacy/1/en.hbs',
        cdnUrl: null,
        completedUrl: 'https://private/en.hbs',
        mime: 'text/x-handlebars-template',
        extension: 'hbs',
        access: EnumAwsS3Accessibility.private,
        size: 100,
    } satisfies TermPolicyContent;
    const draft = {
        id: 'term-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        contents: [content],
    } satisfies ITermPolicy;

    let service: TermPolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyDomain,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: FileService, useValue: fileService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: UserDomain, useValue: userDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = moduleRef.get(TermPolicyDomain);
    });

    it('rejects publication of an unknown policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(null);

        await expect(
            service.publishByAdmin('missing', 'admin-id')
        ).rejects.toBeInstanceOf(TermPolicyNotFoundException);
    });

    it('rejects publication of an already published policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            status: EnumTermPolicyStatus.published,
        });

        await expect(
            service.publishByAdmin(draft.id, 'admin-id')
        ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
    });

    it('rejects publication of a draft without localized content', async () => {
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            contents: [],
        });

        await expect(
            service.publishByAdmin(draft.id, 'admin-id')
        ).rejects.toBeInstanceOf(TermPolicyContentEmptyException);
    });

    it('moves draft content public, persists it, cleans private files, and notifies', async () => {
        const publicItem = {
            bucket: 'public-bucket',
            key: 'public/privacy/1/en.hbs',
            cdnUrl: 'https://cdn/en.hbs',
            completedUrl: 'https://public/en.hbs',
            mime: content.mime,
            extension: content.extension,
            access: EnumAwsS3Accessibility.public,
            size: content.size,
        };
        const published = {
            ...draft,
            status: EnumTermPolicyStatus.published,
            publishedAt: now,
        };
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentPublicPath.mockReturnValue('public/privacy/1');
        termPolicyUtil.getPath.mockReturnValue('private/privacy/1');
        awsS3Service.copyItems.mockResolvedValue([publicItem]);
        fileService.extractFilenameFromPath.mockImplementation(path =>
            path.endsWith('en.hbs') ? 'en.hbs' : path
        );
        termPolicyRepository.publishInTx.mockResolvedValue(published);

        await expect(
            service.publishByAdmin(draft.id, 'admin-id')
        ).resolves.toBeUndefined();
        expect(termPolicyRepository.publishInTx).toHaveBeenCalledWith(
            expect.anything(),
            draft.id,
            [{ ...publicItem, language: EnumMessageLanguage.en }]
        );
        expect(awsS3Service.copyItems).toHaveBeenCalledWith(
            draft.contents,
            'public/privacy/1',
            { access: EnumAwsS3Accessibility.public }
        );
        expect(notificationQueue.sendPublishTermPolicy).toHaveBeenCalledWith(
            { type: EnumTermPolicyType.privacy, version: 1 },
            'admin-id'
        );
    });
});
