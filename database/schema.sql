CREATE TABLE if not EXISTS user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    nb_personnes INT NOT NULL CHECK (nb_personnes >= 1),
    type_habitation ENUM('maison','ferme','residence','collectif') NOT NULL,
    quota_jour FLOAT NOT NULL CHECK (quota_jour BETWEEN 50 AND 500),
    village VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_references (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    volume_eco FLOAT NOT NULL,
    volume_max FLOAT NOT NULL,
    category ENUM('domestique','agricole','collectif') DEFAULT 'domestique',
    alert_weight TINYINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS consumptions (
    id INT AUTO_INCREMENT PRIMARY KEY,        -- Identifiant unique
    user_id INT NOT NULL,                     -- Lien vers user (FK)
    activity_id INT NOT NULL,                 -- Lien vers activité (FK)
    volume FLOAT NOT NULL,                    -- Volume réel consommé en litres
    date DATE NOT NULL,                       -- Date de la consommation
    time TIME NOT NULL,                       -- Heure exacte de la consommation
    synced BOOLEAN DEFAULT TRUE,              -- Pour gestion offline/online
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Enregistrement automatique
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES user_profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_activity FOREIGN KEY (activity_id)
        REFERENCES activity_references(id)
        ON DELETE RESTRICT
);

CREATE TABLE if NOT EXISTS alerts  (
    id INT AUTO_INCREMENT PRIMARY KEY,         -- Identifiant unique
    user_id INT NOT NULL,                      -- Lien vers l'utilisateur
    consumption_id INT NOT NULL,               -- Lien vers la consommation concernée
    level TINYINT NOT NULL,                    -- Niveau de gravité : 1=info, 2=warning, 3=critique
    message TEXT NOT NULL,                     -- Message d'alerte à afficher
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date et heure de l'alerte
    CONSTRAINT fk_alert_user FOREIGN KEY (user_id)
        REFERENCES user_profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_alert_consumption FOREIGN KEY (consumption_id)
        REFERENCES consumptions(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_level CHECK (level BETWEEN 1 AND 3)
);
CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY,           -- Identifiant unique du badge
    user_id INT NOT NULL,                        -- Lien vers l’utilisateur
    badge_type ENUM('eco_warrior', 'water_saver', 'week_champion', 'month_hero') NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date et heure de l’obtention
    CONSTRAINT fk_badge_user FOREIGN KEY (user_id)
        REFERENCES user_profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT uniq_user_badge UNIQUE (user_id, badge_type)  -- Un badge par type par user
);
