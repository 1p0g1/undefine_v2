# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added proper validation for game session start time
- Added comprehensive error handling in guess submission
- Added score calculation and leaderboard updates
- Added user statistics tracking
- Added start_time to WordResponse type and API response

### Changed
- Improved type safety in game session handling
- Enhanced error messages with detailed feedback
- Optimized game state management in useGame hook
- Refined guess submission process with better validation
- Changed client to use server's start_time instead of generating locally

### Fixed
- Fixed word handling in game sessions
- Fixed type definitions for game session state
- Fixed validation for required fields in guess submission
- Fixed score calculation timing
- Fixed start time mismatch between client and server

### Security
- Added validation for game session and word ID matches
- Added start time validation to prevent session tampering
- Improved session integrity by using server-generated timestamps 