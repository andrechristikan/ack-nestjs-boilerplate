import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';
import type { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';

describe('TermPolicyContentHttpService', () => {
    const termPolicyContentDomain: MockProxy<TermPolicyContentDomain> =
        mock<TermPolicyContentDomain>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const metadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };
    const preparedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminTermPolicyUpdateContent,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const draftTermPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };

    const presign: IAwsS3Presign = {
        key: 'term-policies/privacy/v1/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        presignUrl: 'https://s3.example.com/presign',
        expiredInSeconds: 900,
    };

    let service: TermPolicyContentHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogDomain.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentHttpService,
                {
                    provide: TermPolicyContentDomain,
                    useValue: termPolicyContentDomain,
                },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(TermPolicyContentHttpService);
    });

    describe('generateContentPresignByAdmin', () => {
        it('wraps the generated presign in the response envelope', async () => {
            const body: TermPolicyContentPresignRequestDto = {
                type: EnumTermPolicyType.privacy,
                version: 1,
                language: EnumMessageLanguage.en,
                size: 1024,
            };
            termPolicyContentDomain.generateContentPresignByAdmin.mockResolvedValue(
                presign
            );

            const result = await service.generateContentPresignByAdmin(body);

            expect(result).toEqual({ data: presign });
            expect(
                termPolicyContentDomain.generateContentPresignByAdmin
            ).toHaveBeenCalledWith(body);
        });
    });

    describe('updateContentByAdmin', () => {
        it('returns an empty response after updating the content', async () => {
            const body: TermPolicyContentRequestDto = {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/en.hbs',
            };
            termPolicyContentDomain.updateContentByAdmin.mockResolvedValue(
                draftTermPolicy
            );

            const result = await service.updateContentByAdmin(
                'term-policy-1',
                body
            );

            expect(result).toEqual({});
            expect(
                termPolicyContentDomain.updateContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', body);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyUpdateContent,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });
    });

    describe('updateContentByAdmin on a failed write', () => {
        it('stages no activity log when the domain rejects', async () => {
            termPolicyContentDomain.updateContentByAdmin.mockRejectedValue(
                new Error('write failed')
            );

            await expect(
                service.updateContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                })
            ).rejects.toThrow('write failed');

            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('addContentByAdmin', () => {
        it('returns an empty response after adding the content', async () => {
            const body: TermPolicyContentRequestDto = {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/en.hbs',
            };
            termPolicyContentDomain.addContentByAdmin.mockResolvedValue(
                draftTermPolicy
            );

            const result = await service.addContentByAdmin(
                'term-policy-1',
                body
            );

            expect(result).toEqual({});
            expect(
                termPolicyContentDomain.addContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', body);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyAddContent,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });
    });

    describe('removeContentByAdmin', () => {
        it('returns an empty response after removing the content', async () => {
            termPolicyContentDomain.removeContentByAdmin.mockResolvedValue(
                draftTermPolicy
            );

            const result = await service.removeContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
            });

            expect(result).toEqual({});
            expect(
                termPolicyContentDomain.removeContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                draftTermPolicy,
                timestamp
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyRemoveContent,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });
    });

    describe('getContentByAdmin', () => {
        it('wraps the resolved presign in the response envelope', async () => {
            termPolicyContentDomain.getContentByAdmin.mockResolvedValue(
                presign
            );

            const result = await service.getContentByAdmin(
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(result).toEqual({ data: presign });
            expect(
                termPolicyContentDomain.getContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
        });
    });
});
