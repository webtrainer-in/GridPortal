-- Clear old migration history and mark only InitialCreate as applied
-- Step 1: Delete all old migration entries
DELETE FROM "__EFMigrationsHistory";

-- Step 2: Insert only the new InitialCreate migration
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251201064023_InitialCreate', '9.0.0');
