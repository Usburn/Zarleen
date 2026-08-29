CREATE TABLE IF NOT EXISTS users(
 id_user SERIAL PRIMARY KEY,
 nom VARCHAR(30) NOT NULL,
 prenom VARCHAR(50) NOT NULL,
 email VARCHAR(50) NOT NULL,
 password VARCHAR(100) NOT NULL
);


CREATE TABLE IF NOT EXISTS posts(
 id_post SERIAL PRIMARY KEY,
 titre VARCHAR(100) NOT NULL,
 accroche varchar(100) default null,
 date DATE DEFAULT CURRENT_DATE,
 id_user INT NOT NULL,
 FOREIGN KEY(id_user) REFERENCES users(id_user)
);



CREATE TABLE IF NOT EXISTS comments(
 id_comment SERIAL PRIMARY KEY,
 content VARCHAR(542) default NULL,
 date_comment date,
 image TEXT,
 id_post INT NOT NULL,
 FOREIGN KEY(id_post) REFERENCES posts(id_post)
);


CREATE TABLE IF NOT EXISTS donnees (
    id_donnee SERIAL PRIMARY KEY,
    date_donnee TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quantite INT NOT NULL,
    selle VARCHAR(6),
    urine VARCHAR(6),
    quantite_lait INT DEFAULT NULL,
    poids FLOAT DEFAULT NULL
);


ALTER TABLE comments
ALTER COLUMN content DROP NOT NULL;










