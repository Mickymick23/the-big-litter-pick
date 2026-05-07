<?php
// ---DATABASE CONNECTION---

// connect to PostgreSQL database
function get_db() {
    return pg_connect(getenv("DATABASE_URL"));
}