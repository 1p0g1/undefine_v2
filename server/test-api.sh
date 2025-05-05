#!/bin/bash

# Test valid player ID
echo "Testing /api/word with valid player ID..."
curl -X GET "http://localhost:3001/api/word" \
  -H "x-player-id: 123e4567-e89b-12d3-a456-426614174000"
echo -e "\n"

# Test invalid player ID
echo "Testing /api/word with invalid player ID..."
curl -X GET "http://localhost:3001/api/word" \
  -H "x-player-id: invalid-id"
echo -e "\n"

# Store game ID from first response
GAME_ID=$(curl -s -X GET "http://localhost:3001/api/word" \
  -H "x-player-id: 123e4567-e89b-12d3-a456-426614174000" | jq -r '.gameId')

# Test guess submission
echo "Testing /api/guess with game ID: $GAME_ID..."
curl -X POST "http://localhost:3001/api/guess" \
  -H "Content-Type: application/json" \
  -H "x-player-id: 123e4567-e89b-12d3-a456-426614174000" \
  -d "{\"gameId\": \"$GAME_ID\", \"guess\": \"quixotic\"}" 