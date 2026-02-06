-- Remove apiCache table
DROP TABLE IF EXISTS `api_cache`;

-- Remove obsolete api_cache_ttl_days setting
DELETE FROM `settings` WHERE `key` = 'api_cache_ttl_days';
