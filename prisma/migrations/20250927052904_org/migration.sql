/*
  Warnings:

  - Added the required column `organization_id` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Made the column `policy_id` on table `employees` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_policy_id_fkey";

-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "organization_id" INTEGER NOT NULL,
ALTER COLUMN "policy_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
