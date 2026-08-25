ALTER TABLE trips
  ADD COLUMN budget_amount BIGINT UNSIGNED NULL AFTER description;

CREATE TABLE trip_expenses (
  id             INT NOT NULL AUTO_INCREMENT,
  trip_id        INT NOT NULL,
  description    VARCHAR(100) NOT NULL,
  category       VARCHAR(30) NOT NULL,
  amount         BIGINT UNSIGNED NOT NULL,
  payment_status VARCHAR(20) NOT NULL,
  paid_at        DATE,
  memo           TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_trip_expenses_trip_category (trip_id, category),

  CONSTRAINT fk_trip_expenses_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE
);
