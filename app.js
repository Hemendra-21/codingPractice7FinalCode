const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
app.use(express.json());

const databasePath = path.join(__dirname, "cricketMatchDetails.db");
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running successfully at port 3000");
    });
  } catch (error) {
    console.log(`Database error ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDatabaseObjToResponseObj = (databaseObject) => {
  return {
    playerId: databaseObject.player_id,
    playerName: databaseObject.player_name,
  };
};

const modifyMatchDetails = (dbResponse) => {
  return {
    matchId: dbResponse.match_id,
    match: dbResponse.match,
    year: dbResponse.year,
  };
};

const modifyPlayerDetails = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

// API-1 Get all players
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `
      SELECT
       * 
      FROM
        player_details;`;

  const allPlayers = await database.all(getAllPlayersQuery);
  response.send(
    allPlayers.map((eachItem) => convertDatabaseObjToResponseObj(eachItem))
  );
});

// API-2 Get player based on Id
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerOfIdQuery = `
      SELECT
        *
      FROM
        player_details
      WHERE 
        player_id = ${playerId};`;

  const playerDetails = await database.get(getPlayerOfIdQuery);
  response.send(convertDatabaseObjToResponseObj(playerDetails));
});

// API-3 update details of player of ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;

  const updateQuery = `
    UPDATE 
      player_details
    SET
      player_name = '${playerName}'
    WHERE player_id = ${playerId};`;

  await database.run(updateQuery);
  response.send("Player Details Updated");
});

// API-4 Get match details of match Id
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;

  const getDetailsQuery = `
      SELECT
        *
      FROM
        match_details
      WHERE
        match_id = ${matchId};`;
  const dbResponse = await database.get(getDetailsQuery);
  response.send(modifyMatchDetails(dbResponse));
});

// API-5 Get match details of player Id
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getAllMatchesOfPlayerQuery = `
    SELECT
      *
    FROM
      player_match_score NATURAL JOIN match_details
    WHERE 
      player_id = ${playerId};`;
  const dbResponse = await database.all(getAllMatchesOfPlayerQuery);

  const modifiedResults = dbResponse.map((eachItem) =>
    modifyMatchDetails(eachItem)
  );

  response.send(modifiedResults);
});

// API-6 Get details of player of match ID
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayerDetailsQuery = `
      SELECT 
        *
      FROM
       player_match_score 
       NATURAL JOIN  player_details
      WHERE 
        match_id = ${matchId};`;
  const playersDetails = await database.all(getPlayerDetailsQuery);
  response.send(
    playersDetails.map((eachPlayer) => modifyPlayerDetails(eachPlayer))
  );
});

// API-7 Get stats
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScored = `
    SELECT
      player_id AS playerId,
      player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes
    FROM 
      player_details NATURAL JOIN player_match_score 
    WHERE player_id = ${playerId};
    `;
  const stats = await database.get(getPlayerScored);
  response.send(stats);
  console.log(stats);
});

module.exports = app;
