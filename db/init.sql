-- 接続文字コードを明示的に設定する（日本語文字化け防止）
SET NAMES utf8mb4;

-- users テーブルの作成
CREATE TABLE IF NOT EXISTS users (
  id            INT          NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ここから自分のアプリに必要なテーブルを追加していく
CREATE TABLE IF NOT EXISTS trips (
  id          INT          AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  title       VARCHAR(100) NOT NULL,
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  description TEXT,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),

  CONSTRAINT fk_trips_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

INSERT INTO trips (
  user_id,
  title,
  start_date,
  end_date,
  description
)
VALUES (
  1,
  '京都旅行',
  '2026-08-20',
  '2026-08-22',
  '夏休みの京都旅行'
);

CREATE TABLE trip_places (
  id          INT NOT NULL AUTO_INCREMENT,
  trip_id     INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  is_visited  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_trip_places_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE
);

CREATE TABLE itinerary_items (
  id            INT NOT NULL AUTO_INCREMENT,
  trip_id       INT NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  place_name    VARCHAR(100) NOT NULL,
  trip_place_id INT,
  memo          TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

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
