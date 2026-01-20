-- Fonction pour remettre en stock automatiquement après 24h
CREATE OR REPLACE FUNCTION auto_restock_items()
RETURNS void AS $$
BEGIN
    UPDATE menu_items 
    SET out_of_stock = FALSE, out_of_stock_date = NULL
    WHERE out_of_stock = TRUE 
    AND out_of_stock_date < CURRENT_DATE - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Optionnel: Créer un trigger qui s'exécute régulièrement (nécessite pg_cron)
-- SELECT cron.schedule('auto-restock', '0 */6 * * *', 'SELECT auto_restock_items();');
