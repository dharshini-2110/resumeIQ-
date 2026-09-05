CREATE TABLE `jobApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`company` varchar(256) NOT NULL,
	`role` varchar(256) NOT NULL,
	`location` varchar(256),
	`jobUrl` varchar(1024),
	`salary` varchar(128),
	`status` enum('saved','applied','interview','offer','rejected') NOT NULL DEFAULT 'saved',
	`notes` text,
	`appliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboardingProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 0,
	`completed` int NOT NULL DEFAULT 0,
	`targetRole` varchar(256),
	`experienceLevel` varchar(64),
	`interests` mediumtext,
	`selectedTools` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardingProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboardingProfiles_userId_unique` UNIQUE(`userId`)
);
