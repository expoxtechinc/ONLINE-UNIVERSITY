CREATE TABLE `account_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`passwordSalt` varchar(128) NOT NULL,
	`recoveryPinHash` varchar(255),
	`passwordChangedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_credentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `account_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verificationCode` varchar(64) NOT NULL,
	`studentId` int NOT NULL,
	`courseId` int NOT NULL,
	`finalScore` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_verification_unique` UNIQUE(`verificationCode`),
	CONSTRAINT `certificates_student_course_unique` UNIQUE(`studentId`,`courseId`)
);
--> statement-breakpoint
CREATE TABLE `course_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`sizeBytes` int NOT NULL,
	`kind` enum('video','image','document') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `course_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(120) NOT NULL,
	`level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`durationMinutes` int NOT NULL DEFAULT 0,
	`priceCents` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`thumbnailKey` varchar(512),
	`thumbnailUrl` varchar(1024),
	`learningObjectives` text,
	`requirements` text,
	`targetAudience` text,
	`certificateEligible` enum('yes','no') NOT NULL DEFAULT 'yes',
	`status` enum('draft','review','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`courseId` int NOT NULL,
	`status` enum('pending_payment','active','completed','refunded','cancelled') NOT NULL DEFAULT 'pending_payment',
	`progressPercent` int NOT NULL DEFAULT 0,
	`stripeCheckoutSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`paidAmountCents` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`enrolledAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollments_student_course_unique` UNIQUE(`studentId`,`courseId`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`type` enum('video','article','flashcards','quiz','test','final_exam') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`position` int NOT NULL DEFAULT 0,
	`richText` text,
	`videoKey` varchar(512),
	`videoUrl` varchar(1024),
	`videoDurationSeconds` int,
	`assessmentJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeEventId` varchar(255) NOT NULL,
	`enrollmentId` int,
	`eventType` varchar(128) NOT NULL,
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_events_stripe_event_unique` UNIQUE(`stripeEventId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','student','instructor','admin') NOT NULL DEFAULT 'student';--> statement-breakpoint
CREATE INDEX `assets_course_idx` ON `course_assets` (`courseId`);--> statement-breakpoint
CREATE INDEX `modules_course_idx` ON `course_modules` (`courseId`);--> statement-breakpoint
CREATE INDEX `courses_author_idx` ON `courses` (`authorId`);--> statement-breakpoint
CREATE INDEX `courses_status_idx` ON `courses` (`status`);--> statement-breakpoint
CREATE INDEX `enrollments_course_idx` ON `enrollments` (`courseId`);--> statement-breakpoint
CREATE INDEX `lessons_module_idx` ON `lessons` (`moduleId`);