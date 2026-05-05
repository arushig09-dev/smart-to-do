-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "linkedProjectId" INTEGER,
ADD COLUMN     "linkedSectionId" INTEGER;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_linkedSectionId_fkey" FOREIGN KEY ("linkedSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
