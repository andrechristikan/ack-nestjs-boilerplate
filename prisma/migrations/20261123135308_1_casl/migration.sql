-- CreateEnum
CREATE TYPE "EnumRoleScope" AS ENUM ('platform', 'workspace', 'project');

-- AlterEnum
BEGIN;
CREATE TYPE "EnumPolicySubject_new" AS ENUM ('all', 'ApiKey', 'Role', 'User', 'Session', 'ActivityLog', 'PasswordHistory', 'TermPolicy', 'FeatureFlag', 'Device', 'DeviceOwnership', 'Workspace', 'WorkspaceMember', 'WorkspaceInvite', 'WorkspaceJoinRequest', 'Project', 'ProjectMember', 'Analytic', 'WorkspaceAnalytic');
ALTER TABLE "policies" ALTER COLUMN "subject" TYPE "EnumPolicySubject_new" USING ("subject"::text::"EnumPolicySubject_new");
ALTER TYPE "EnumPolicySubject" RENAME TO "EnumPolicySubject_old";
ALTER TYPE "EnumPolicySubject_new" RENAME TO "EnumPolicySubject";
DROP TYPE "public"."EnumPolicySubject_old";
COMMIT;

-- DropIndex
DROP INDEX "policies_roleId_subject_key";

-- DropIndex
DROP INDEX "project_members_projectId_role_createdAt_id_idx";

-- DropIndex
DROP INDEX "roles_name_key";

-- DropIndex
DROP INDEX "roles_type_createdAt_id_idx";

-- DropIndex
DROP INDEX "workspace_members_userId_role_idx";

-- DropIndex
DROP INDEX "workspace_members_workspaceId_role_createdAt_id_idx";

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "inverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "project_members" DROP COLUMN "role",
ADD COLUMN     "roleId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "type",
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "policyRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scope" "EnumRoleScope" NOT NULL;

-- AlterTable
ALTER TABLE "workspace_invites" DROP COLUMN "projectRole",
DROP COLUMN "workspaceRole",
ADD COLUMN     "projectRoleId" UUID,
ADD COLUMN     "workspaceRoleId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "role",
ADD COLUMN     "roleId" UUID NOT NULL;

-- DropEnum
DROP TYPE "EnumProjectMemberRole";

-- DropEnum
DROP TYPE "EnumRoleType";

-- DropEnum
DROP TYPE "EnumWorkspaceMemberRole";

-- CreateIndex
CREATE INDEX "policies_roleId_subject_idx" ON "policies"("roleId", "subject");

-- CreateIndex
CREATE INDEX "project_members_projectId_roleId_createdAt_id_idx" ON "project_members"("projectId", "roleId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "roles_scope_createdAt_id_idx" ON "roles"("scope", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_scope_key_key" ON "roles"("scope", "key");

-- CreateIndex
CREATE INDEX "workspace_members_userId_roleId_idx" ON "workspace_members"("userId", "roleId");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_roleId_createdAt_id_idx" ON "workspace_members"("workspaceId", "roleId", "createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspaceRoleId_fkey" FOREIGN KEY ("workspaceRoleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_projectRoleId_fkey" FOREIGN KEY ("projectRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
