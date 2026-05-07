<?php
// ---LOAD ROADS---

// connect to database
require "../db.php";
$conn = get_db();

// handle failed connection
if (!$conn) {
	header('Content-Type: application/json');
	echo json_encode(["error" => "DB connection failed"]);
	exit;
}

// get bounding box coordinates
$minx = $_GET['minx'] ?? null;
$miny = $_GET['miny'] ?? null;
$maxx = $_GET['maxx'] ?? null;
$maxy = $_GET['maxy'] ?? null;

// convert to numeric
$minx = (float)$minx;
$miny = (float)$miny;
$maxx = (float)$maxx;
$maxy = (float)$maxy;

// get current zoom level
$zoom = isset($_GET["zoom"]) ? (int)$_GET["zoom"] : 10;

// if missing params return empty JSON
if (!$minx || !$miny || !$maxx || !$maxy) {
	header('Content-Type: application/json');
	echo json_encode(["type" => "FeatureCollection", "features" => []]);
	exit;
}

// control which road types are visible depending on zoom level
function getHighwayFilter($zoom) {
	if ($zoom <= 10) {
		return "highway IN ('motorway','trunk')";
	}
	elseif ($zoom <= 11) {
		return "highway IN ('motorway','trunk')";
	}
	elseif ($zoom <= 12) {
		return "highway IN ('motorway','trunk','primary')";
	}
	elseif ($zoom <= 13) {
		return "highway IN (
			'motorway','trunk','primary','secondary','tertiary',
			'motorway_link','trunk_link','primary_link','secondary_link','tertiary_link'
		)";
	}
	elseif ($zoom <= 14) {
		return "highway IN (
			'motorway','trunk','primary','secondary','tertiary',
			'motorway_link','trunk_link','primary_link','secondary_link','tertiary_link',
			'residential','unclassified','living_street','road'
		)";
	}
	elseif ($zoom <= 15) {
		return "highway IN (
			'motorway','trunk','primary','secondary','tertiary',
			'motorway_link','trunk_link','primary_link','secondary_link','tertiary_link',
			'residential','unclassified','living_street','road',
			'service','track'
		)";
	}
	// fallback - no filter
	else {
		return "TRUE";
	}
}

// reduce detail with different zoom levels for performance
if ($zoom <= 10) $tolerance = 20;
elseif ($zoom <= 13) $tolerance = 5;
elseif ($zoom <= 15) $tolerance = 1;
else $tolerance = 0.5;

// apply highway filter based on zoom
$highwayFilter = getHighwayFilter($zoom);

// change amount of segments renders to maximise user experience while keeping rendering speed
if ($zoom <= 18) $limit = 7000;
elseif ($zoom == 19) $limit = 3000;
elseif ($zoom == 20) $limit = 2000;
else $limit = 1000;

// fetch filtered roads within bounding box and appropriate for zoom level
$sql = "
-- create bounding box
WITH bbox AS (
    SELECT ST_Transform(
        ST_MakeEnvelope(
            $minx, $miny, $maxx, $maxy, 4326
        ),
        27700
    ) AS geom
)
SELECT
	id,
	name,
	z_order,
	rating_letter,
	report_count,
	last_reported,
	-- convert geometry to GeoJSON
	ST_AsGeoJSON(
	    ST_Transform(
	        roads.geom,
	        4326
	    ),
	    4
	) AS geometry
FROM roads
CROSS JOIN bbox
WHERE
	-- apply zoom-based filter
	$highwayFilter
	-- apply bounding box filter
	AND ST_Intersects(
	    roads.geom,
	    bbox.geom
	)
--Prioritise major roads
ORDER BY z_order DESC
LIMIT $limit;
";

// execute query
$result = pg_query($conn, $sql);

// handle query failure
if (!$result) {
	header('Content-Type: application/json');
	echo json_encode([
		"error" => "Query failed",
		"details" => pg_last_error($conn)
	]);
	exit;
}

// convert to GeoJSON format
function make_feature($geometry, $properties = []) {
	return [
		"type" => "Feature",
		"geometry" => json_decode($geometry),
		"properties" => $properties
	];
}

// store features
$features = [];

// loop through results and build features
while ($row = pg_fetch_assoc($result)) {
	$features[] = make_feature($row["geometry"], [
		"id" => $row["id"],
		"name" => $row["name"],
		"rating_letter" => $row["rating_letter"],
		"report_count" => $row["report_count"],
		"last_reported" => $row["last_reported"]
	]);
}

// create full FeatureCollection for Leaflet
echo json_encode([
	"type" => "FeatureCollection",
	"features" => $features
]);

?>
