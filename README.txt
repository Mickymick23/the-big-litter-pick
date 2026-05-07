# The Big Litter Pick

## Overview

An interactive web app which allows citizens to report litter data from any road or path segment and put them into a centralized database real-time. The project explores the benefits of crowdsourced, citizen-led data compared to governmental data.

## Features

- Interactive Leaflet map
	- User selects road segments and rates litter (A-D)
	- Data updates real-time
	- Users can see data in road interactive map

## Technologies Used

- HTML
- JavaScript (Leaflet)
- PHP
- PostgreSQL with PostGIS (database)
- Render (host)

## How to Run the Project

The application is deployed online and can be accessed here: 

https://thebiglitterpick.onrender.com

## File Structure

- thebiglitterpick
	- 'index.html' - main page explaining project
	- 'style.css' - main page styling
	- 'bin.png' - main page icon
	- 'db.php' - database connection
	- 'roads' - folder containing all files relating to the map page
		- 'roads.html' - map page
		- 'style.css' - map page styling
		- 'roads.js' - map logic and UI
		- 'boundary.php' - load Hertfordshire boundary
		- 'roads.php' - retrieve road data from database
		- 'submit_report.php' - handle user submissions
