CREATE TABLE IF NOT EXISTS itinerary_items (
  id             INT NOT NULL AUTO_INCREMENT,
  trip_id        INT NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time     TIME,
  end_time       TIME,
  place_name     VARCHAR(100) NOT NULL,
  trip_place_id  INT,
  memo           TEXT,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_itinerary_items_trip_date_order (trip_id, scheduled_date, sort_order),

  CONSTRAINT fk_itinerary_items_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_itinerary_items_trip_place
    FOREIGN KEY (trip_place_id)
    REFERENCES trip_places(id)
    ON DELETE SET NULL
);
