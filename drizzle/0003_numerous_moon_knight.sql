CREATE TABLE `lesson_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`lessonId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_completions_student_lesson_unique` UNIQUE(`studentId`,`lessonId`)
);
--> statement-breakpoint
CREATE INDEX `lesson_completions_student_idx` ON `lesson_completions` (`studentId`);