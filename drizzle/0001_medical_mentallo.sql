CREATE TABLE `atsScans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resumeVersionId` int,
	`resumeContent` mediumtext NOT NULL,
	`atsScore` int NOT NULL DEFAULT 0,
	`issues` mediumtext,
	`foundKeywords` mediumtext,
	`missingKeywords` mediumtext,
	`buzzwords` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atsScans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `careerPaths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetRole` varchar(256) NOT NULL,
	`currentSkills` mediumtext,
	`predictedPaths` mediumtext,
	`roadmap` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `careerPaths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` mediumtext NOT NULL,
	`context` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `githubAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`githubUsername` varchar(128) NOT NULL,
	`analysis` mediumtext,
	`score` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `githubAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interviewSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(256) NOT NULL,
	`questions` mediumtext,
	`sessionState` enum('active','completed') NOT NULL DEFAULT 'active',
	`feedback` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interviewSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobFitResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resumeContent` mediumtext NOT NULL,
	`jobDescription` mediumtext NOT NULL,
	`matchScore` int NOT NULL DEFAULT 0,
	`gapAnalysis` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobFitResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumeVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`content` mediumtext NOT NULL,
	`atsScore` int NOT NULL DEFAULT 0,
	`jobFitScore` int DEFAULT 0,
	`jobDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resumeVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewriteSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resumeContent` mediumtext NOT NULL,
	`suggestions` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewriteSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skillGapAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetRole` varchar(256) NOT NULL,
	`resumeContent` mediumtext NOT NULL,
	`currentSkills` mediumtext,
	`gapSkills` mediumtext,
	`roadmap` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skillGapAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalXP` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`badges` mediumtext,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastActiveDate` varchar(10),
	`tasksCompleted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProgress_id` PRIMARY KEY(`id`)
);
