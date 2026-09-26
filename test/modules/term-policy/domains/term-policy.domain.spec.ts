import { Test, type TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
    EnumActivityLogAction,
    type TermPolicyContent,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';

describe('TermPolicyDomain', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
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
        databaseUtil.createId.mockReturnValue('new-term-id');
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(async callback =>
            callback({} as IDatabaseTransactionClient)
        );
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

    it('maps public content without a matching language to undefined', () => {
        const item = {
            bucket: 'public-bucket',
            key: 'public/privacy/1/fr.hbs',
            cdnUrl: null,
            completedUrl: 'https://public/fr.hbs',
            mime: content.mime,
            extension: content.extension,
            access: EnumAwsS3Accessibility.public,
            size: content.size,
        };
        fileService.extractFilenameFromPath.mockImplementation(
            path => path.split('/').at(-1) ?? path
        );

        expect(service.mapPublicContent([item], [content])).toEqual([
            { ...item, language: undefined },
        ]);
    });

    it('delegates admin and published lists', async () => {
        const pagination = { page: 1, perPage: 10 } as never;
        const filter = { type: { in: [EnumTermPolicyType.privacy] } } as never;
        const status = {
            status: { in: [EnumTermPolicyStatus.published] },
        } as never;
        const result = { data: [], pagination: {} } as never;
        termPolicyRepository.find.mockResolvedValue(result);
        termPolicyRepository.findPublished.mockResolvedValue(result);

        await expect(
            service.getListByAdmin(pagination, filter, status)
        ).resolves.toBe(result);
        await expect(
            service.getListPublished(pagination, filter)
        ).resolves.toBe(result);
    });

    it('rejects a duplicate type and version', async () => {
        termPolicyRepository.existsByVersionAndType.mockResolvedValue(true);

        await expect(
            service.createByAdmin({
                contents: [],
                type: draft.type,
                version: draft.version,
            })
        ).rejects.toBeInstanceOf(TermPolicyExistException);
    });

    it('rejects duplicate content languages', async () => {
        termPolicyRepository.existsByVersionAndType.mockResolvedValue(false);
        termPolicyUtil.validateUniqueLanguages.mockReturnValue(false);

        await expect(
            service.createByAdmin({
                contents: [],
                type: draft.type,
                version: draft.version,
            })
        ).rejects.toBeInstanceOf(TermPolicyLanguageDuplicateException);
    });

    it('creates a draft with mapped private content and activity', async () => {
        const upload = {
            language: content.language,
            key: content.key,
            size: content.size,
        };
        const mapped = {
            bucket: content.bucket,
            key: content.key,
            cdnUrl: content.cdnUrl,
            completedUrl: content.completedUrl,
            mime: content.mime,
            extension: content.extension,
            access: content.access,
            size: content.size,
        };
        termPolicyRepository.existsByVersionAndType.mockResolvedValue(false);
        termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
        awsS3Service.mapPresign.mockReturnValue(mapped);
        termPolicyRepository.create.mockResolvedValue(draft);

        await expect(
            service.createByAdmin({
                contents: [upload],
                type: draft.type,
                version: draft.version,
            })
        ).resolves.toBe(draft);
        expect(termPolicyRepository.create).toHaveBeenCalledWith(
            'new-term-id',
            { contents: [upload], type: draft.type, version: draft.version },
            [{ language: content.language, ...mapped }]
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.adminTermPolicyCreate,
            metadata: undefined,
        });
    });

    it.each([
        [
            'typed',
            new TermPolicyNotFoundException(),
            TermPolicyNotFoundException,
        ],
        ['unknown', new Error('failure'), AppUnknownException],
    ])('maps %s create failures', async (_name, error, expected) => {
        termPolicyRepository.existsByVersionAndType.mockResolvedValue(false);
        termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
        awsS3Service.mapPresign.mockImplementation(() => {
            throw error;
        });

        await expect(
            service.createByAdmin({
                contents: [
                    {
                        language: content.language,
                        key: content.key,
                        size: content.size,
                    },
                ],
                type: draft.type,
                version: draft.version,
            })
        ).rejects.toBeInstanceOf(expected);
    });

    it('rejects deleting an unknown policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(null);

        await expect(service.deleteByAdmin('missing')).rejects.toBeInstanceOf(
            TermPolicyNotFoundException
        );
    });

    it('rejects deleting a published policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            status: EnumTermPolicyStatus.published,
        });

        await expect(service.deleteByAdmin(draft.id)).rejects.toBeInstanceOf(
            TermPolicyStatusInvalidException
        );
    });

    it('deletes a draft and its private content', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getPath.mockReturnValue('private/privacy/1');
        termPolicyRepository.delete.mockResolvedValue(draft);

        await expect(service.deleteByAdmin(draft.id)).resolves.toBe(draft);
        expect(awsS3Service.deleteDir).toHaveBeenCalledWith(
            'private/privacy/1',
            { access: EnumAwsS3Accessibility.private }
        );
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it.each([
        [
            'typed',
            new TermPolicyNotFoundException(),
            TermPolicyNotFoundException,
        ],
        ['unknown', new Error('failure'), AppUnknownException],
    ])('maps %s delete failures', async (_name, error, expected) => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getPath.mockImplementation(() => {
            throw error;
        });

        await expect(service.deleteByAdmin(draft.id)).rejects.toBeInstanceOf(
            expected
        );
    });

    it.each([
        [
            'typed',
            new TermPolicyNotFoundException(),
            TermPolicyNotFoundException,
        ],
        ['unknown', new Error('failure'), AppUnknownException],
    ])('maps %s publish failures', async (_name, error, expected) => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentPublicPath.mockImplementation(() => {
            throw error;
        });

        await expect(
            service.publishByAdmin(draft.id, 'admin-id')
        ).rejects.toBeInstanceOf(expected);
    });
});
