CREATE DATABASE IF NOT EXISTS accident_response_db;
USE accident_response_db;

-- 1. Area table
CREATE TABLE `area` (
  `area_id` int NOT NULL AUTO_INCREMENT,
  `area_name` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `area_rating` float DEFAULT '0',
  PRIMARY KEY (`area_id`)
);

-- 2. Road table
CREATE TABLE `road` (
  `road_id` int NOT NULL AUTO_INCREMENT,
  `road_name` varchar(100) NOT NULL,
  `road_type` varchar(50) DEFAULT NULL,
  `speed_limit` int DEFAULT NULL,
  `area_id` int DEFAULT NULL,
  PRIMARY KEY (`road_id`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `road_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `area` (`area_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Main Accident table (Relational)
CREATE TABLE `accident` (
  `accident_id` int NOT NULL AUTO_INCREMENT,
  `accident_date` date NOT NULL,
  `accident_time` time NOT NULL,
  `location_description` varchar(255) DEFAULT NULL,
  `weather_condition` varchar(50) DEFAULT NULL,
  `visibility_level` varchar(50) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `severity_level` varchar(20) DEFAULT NULL,
  `confidence_score` float DEFAULT NULL,
  `road_id` int DEFAULT NULL,
  PRIMARY KEY (`accident_id`),
  KEY `road_id` (`road_id`),
  CONSTRAINT `accident_ibfk_1` FOREIGN KEY (`road_id`) REFERENCES `road` (`road_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_confidence` CHECK ((`confidence_score` between 0 and 1)),
  CONSTRAINT `chk_severity` CHECK ((`severity_level` in ('Low','Medium','High')))
);

-- 4. Image Features matching ML Output
CREATE TABLE `image_features` (
  `feature_id` int NOT NULL AUTO_INCREMENT,
  `damage_score` float DEFAULT NULL,
  `edge_density` float DEFAULT NULL,
  `impact_zone` varchar(50) DEFAULT NULL,
  `accident_id` int DEFAULT NULL,
  PRIMARY KEY (`feature_id`),
  UNIQUE KEY `accident_id` (`accident_id`),
  CONSTRAINT `image_features_ibfk_1` FOREIGN KEY (`accident_id`) REFERENCES `accident` (`accident_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Authority (First responders)
CREATE TABLE `authority` (
  `authority_id` int NOT NULL AUTO_INCREMENT,
  `authority_name` varchar(100) NOT NULL,
  `role` varchar(50) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `area_id` int DEFAULT NULL,
  PRIMARY KEY (`authority_id`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `authority_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `area` (`area_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Generated Alerts
CREATE TABLE `alert` (
  `alert_id` int NOT NULL AUTO_INCREMENT,
  `priority_level` varchar(20) DEFAULT NULL,
  `alert_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT NULL,
  `accident_id` int DEFAULT NULL,
  `authority_id` int DEFAULT NULL,
  PRIMARY KEY (`alert_id`),
  KEY `accident_id` (`accident_id`),
  KEY `authority_id` (`authority_id`),
  CONSTRAINT `alert_ibfk_1` FOREIGN KEY (`accident_id`) REFERENCES `accident` (`accident_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_ibfk_2` FOREIGN KEY (`authority_id`) REFERENCES `authority` (`authority_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_priority` CHECK ((`priority_level` in ('Low','Medium','High')))
);

-- 7. Emergency Response generated for Alerts
CREATE TABLE `response` (
  `response_id` int NOT NULL AUTO_INCREMENT,
  `response_status` varchar(50) DEFAULT NULL,
  `response_time` datetime NOT NULL,
  `alert_id` int DEFAULT NULL,
  PRIMARY KEY (`response_id`),
  UNIQUE KEY `alert_id` (`alert_id`),
  CONSTRAINT `response_ibfk_1` FOREIGN KEY (`alert_id`) REFERENCES `alert` (`alert_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_response_time` CHECK ((`response_time` >= '2000-01-01 00:00:00'))
);
