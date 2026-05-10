DROP TABLE IF EXISTS Files, comments, Posts, users CASCADE;
CREATE TABLE users(
 id_user SERIAL PRIMARY KEY,
 nom VARCHAR(30) NOT NULL,
 prenom VARCHAR(50) NOT NULL,
 email VARCHAR(50) NOT NULL,
 password VARCHAR(100) NOT NULL
);
CREATE TABLE posts(
 id_post SERIAL PRIMARY KEY,
 titre VARCHAR(100) NOT NULL,
 accroche varchar(100) default null,
 id_user INT NOT NULL,
 FOREIGN KEY(id_user) REFERENCES users(id_user)
);
CREATE TABLE comments(
 id_comment SERIAL PRIMARY KEY,
 content VARCHAR(542) NOT NULL,
 date_comment date,
 image TEXT,
 id_post INT NOT NULL,
 FOREIGN KEY(id_post) REFERENCES posts(id_post)
);
