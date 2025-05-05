#!/bin/bash

# Test the health check endpoint
echo "Testing health check endpoint..."
curl -s http://localhost:3001/api/test | jq .

# Test the word endpoint
echo -e "\nTesting word endpoint..."
curl -s http://localhost:3001/api/word | jq .

# Test the guess endpoint
echo -e "\nTesting guess endpoint..."
curl -s -X POST http://localhost:3001/api/guess -H "Content-Type: application/json" -d '{"guess":"test"}' | jq . 