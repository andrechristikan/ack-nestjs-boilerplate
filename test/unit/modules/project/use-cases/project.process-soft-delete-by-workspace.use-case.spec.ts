import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IProjectSoftDeleteByWorkspacePayload } from '@modules/project/interfaces/project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectProcessSoftDeleteByWorkspaceUseCase } from '@modules/project/use-cases/project.process-soft-delete-by-workspace.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('ProjectProcessSoftDeleteByWorkspaceUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const deletedAt = new Date('2026-02-01T10:20:30.000Z');
    const payload: IProjectSoftDeleteByWorkspacePayload = {
        workspaceId: 'workspace-1',
        deletedAt: '2026-02-01T10:20:30.000Z',
        deletedBy: 'user-1',
    };
    let useCase: ProjectProcessSoftDeleteByWorkspaceUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectProcessSoftDeleteByWorkspaceUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: MessageService, useValue: messageService },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'project.delete.chunkSize': 2,
                    }),
                },
            ],
        }).compile();

        useCase = module.get(ProjectProcessSoftDeleteByWorkspaceUseCase);
    });

    describe('execute', () => {
        it('soft-deletes chunk after chunk with the payload date and actor until a chunk comes back short, then answers the queue message', async () => {
            projectService.softDeleteChunkByWorkspace
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(1);

            const result = await useCase.execute(payload);

            expect(result).toEqual({
                message: 'project.queue.softDeleteByWorkspace',
            });
            expect(
                projectService.softDeleteChunkByWorkspace
            ).toHaveBeenCalledTimes(3);
            expect(
                projectService.softDeleteChunkByWorkspace
            ).toHaveBeenNthCalledWith(1, 'workspace-1', deletedAt, 'user-1');
        });

        it('runs one chunk and stops when the workspace has no live project', async () => {
            projectService.softDeleteChunkByWorkspace.mockResolvedValue(0);

            await useCase.execute(payload);

            expect(
                projectService.softDeleteChunkByWorkspace
            ).toHaveBeenCalledTimes(1);
        });

        it('starts the next chunk only after the previous one resolved', async () => {
            const events: string[] = [];
            projectService.softDeleteChunkByWorkspace
                .mockImplementationOnce(async () => {
                    events.push('start:1');
                    await Promise.resolve();
                    events.push('end:1');

                    return 2;
                })
                .mockImplementationOnce(async () => {
                    events.push('start:2');
                    await Promise.resolve();
                    events.push('end:2');

                    return 0;
                });

            await useCase.execute(payload);

            expect(events).toEqual(['start:1', 'end:1', 'start:2', 'end:2']);
        });

        it('throws a fatal QueueException carrying the cause when a chunk rejects, and runs no later chunk', async () => {
            const cause = new Error('mongo down');
            projectService.softDeleteChunkByWorkspace
                .mockResolvedValueOnce(2)
                .mockRejectedValueOnce(cause);

            const rejection = useCase.execute(payload);

            await expect(rejection).rejects.toBeInstanceOf(QueueException);
            await expect(rejection).rejects.toMatchObject({
                message: 'project.queue.error.softDeleteByWorkspace',
                isFatal: true,
                rawError: cause,
            });
            expect(
                projectService.softDeleteChunkByWorkspace
            ).toHaveBeenCalledTimes(2);
        });
    });
});
