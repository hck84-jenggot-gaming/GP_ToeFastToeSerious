# Leaderboard API Documentation

## Endpoints

List of available endpoints:

- GET /api/leaderboard
- GET /api/leaderboard/player/:username

Routes below need authentication:

- None

Routes below need authorization:

- None

## 1. GET /api/leaderboard

**Description:**

- Get the top 10 players ranked by total wins

**Request:**

- No authentication required
- No request body needed

**Response (200 - OK)**

```json
{
  "success": true,
  "data": [
    {
      "username": "string",
      "totalWins": "number"
    },
    {
      "username": "string",
      "totalWins": "number"
    }
  ]
}
```

**Response (500 - Internal Server Error)**

```json
{
  "success": false,
  "error": "Failed to fetch leaderboard"
}
```

## 2. GET /api/leaderboard/player/:username

**Description:**

- Get a specific player's statistics by username

**Request:**

- path parameters:
  - `username` (string, required): The username of the player to lookup

**Response (200 - OK)**

```json
{
  "success": true,
  "data": {
    "username": "string",
    "totalWins": "number"
  }
}
```

**Response (404 - Not Found)**

```json
{
  "success": false,
  "error": "Player not found"
}
```

**Response (500 - Internal Server Error)**

```json
{
  "success": false,
  "error": "Failed to fetch player stats"
}
```

## Data Models

### User

```json
{
  "username": "string",
  "totalWins": "number"
}
```

## Notes

- All endpoints return JSON responses
- The leaderboard is sorted by `totalWins` in descending order
- Maximum of 10 players are returned in the leaderboard endpoint
- Player usernames are unique in the system
- No authentication or authorization is required for these endpoints
