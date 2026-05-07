<?php
// ---SUBMIT REPORT---

// return JSON
header("Content-Type: application/json");

// ensure data is JSON
function respond($data) {
	echo json_encode($data);
	exit;
}

// connect to database
require "../db.php";
$conn = get_db();

// handle failed connection
if (!$conn) {
	respond(["error" => "Connection failed"]);
}

// read JSON data
$data = json_decode(file_get_contents("php://input"), true);

// sanitise
$road_id = isset($data["road_id"]) ? (int)$data["road_id"] : null;
$rating_letter = isset($data["rating"]) ? strtoupper(trim($data["rating"])) : null;

// validate
if (!$road_id || !$rating_letter) {
	respond(["error" => "Missing data"]);
}

// convert rating to numbers
$rating_map = [
	"A" => 4,
	"B" => 3,
	"C" => 2,
	"D" => 1
];

// make sure rating is valid
if (!isset($rating_map[$rating_letter])) {
	respond(["error" => "Invalid rating"]);
}

// convert rating to numeric value
$rating_value = $rating_map[$rating_letter];

// insert new timestamped report into database
$insert_sql = "
INSERT INTO road_reports (road_id, rating_value, created_at)
VALUES ($1, $2, NOW())
";

// prevent SQL injection by executing paramaterised query
$insert_result = pg_query_params($conn, $insert_sql, [$road_id, $rating_value]);

// handle insert failure
if (!$insert_result) {
	respond(["error" => pg_last_error($conn)]);
}

// update road statistics
$sql = "
SELECT 
	r.id,
	r.name,
	COUNT(rep.id) AS report_count,
	MAX(rep.created_at) AS last_reported,
	CASE ROUND(AVG(rep.rating_value))
		WHEN 4 THEN 'A'
		WHEN 3 THEN 'B'
		WHEN 2 THEN 'C'
		WHEN 1 THEN 'D'
	END AS rating_letter
FROM roads r
LEFT JOIN road_reports rep ON r.id = rep.road_id
WHERE r.id = $1
GROUP BY r.id;
";

// execute query
$result = pg_query_params($conn, $sql, [$road_id]);

// handle query failure
if (!$result) {
	respond(["error" => "Query failed"]);
}

// extract result row
$row = pg_fetch_assoc($result);

// return updated road data
echo json_encode($row);
