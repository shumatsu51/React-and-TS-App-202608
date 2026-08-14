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
  PRIMARY KEY (id)
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