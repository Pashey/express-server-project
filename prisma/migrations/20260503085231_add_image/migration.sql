-- AlterTable
ALTER TABLE `questions` ADD COLUMN `imageUrl` VARCHAR(255) NULL;

-- RenameIndex
ALTER TABLE `likes` RENAME INDEX `likes_questionId_fkey` TO `likes_questionId_idx`;
