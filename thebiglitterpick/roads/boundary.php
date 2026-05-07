<?php
// ---ADD HERTFORDSHIRE BOUNDARY---

// connect to database
require "../db.php";
$conn = get_db();

// handle failed connection
if (!$conn) {
	echo "Connection failed";
	exit;
}

// SQL query selecting Hertfordshire geometry from database and converting to appropriate CRS and format
$sql = "
SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
FROM hertfordshire_boundary
";

// query the database, store results
$result = pg_query($conn, $sql);

// create array to store GeoJSON features
$features = [];

// loop through database converting each row to GeoJSON
while ($row = pg_fetch_assoc($result)) {
	$features[] = [
		"type" => "Feature",
		// convert to PHP object to be encoded properly
		"geometry" => json_decode($row["geometry"]),
		// no additional attributes to be stored
		"properties" => []
	];
}

// wrap all features for Leaflet to read
echo json_encode([
	"type" => "FeatureCollection",
	"features" => $features
]);

?>
