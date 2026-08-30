import express from "express"
import bodyParser  from "body-parser"
import pg, { Result } from "pg"
import bcrypt, { hash } from "bcrypt";
import upload from "./upload.js";
import dotenv from "dotenv";
dotenv.config();


const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    statement_timeout: 10000,
    query_timeout: 10000
});

try {
    await db.connect();
    console.log("DB connected ☁️");
} catch (err) {
    console.error("Erreur PostgreSQL :", err);
}




const app = express();
const port = 3000;
const salt = 10;




app.set("views", "./views");
app.set("view engine", "ejs")
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));



async function loadPosts(){
const Posts = await db.query(`
select * from posts 
order by date DESC
LIMIT 100;
 `)
 return Posts.rows
}

async function dailyMilk() {
    const today = new Date();

    const date = today.toISOString().split('T')[0];

    today.setDate(today.getDate() - 1);

    const hier = today.toISOString().split('T')[0];

    const totalMilk = await db.query(`
        SELECT 
            DATE(date_donnee) AS date,
            SUM(quantite) AS total_quantite
        FROM donnees
        WHERE DATE(date_donnee) IN ($1, $2)
        GROUP BY DATE(date_donnee)
        ORDER BY DATE(date_donnee);
    `, [date, hier]);

    const aujourdHui = totalMilk.rows.find(
        row => row.date.toISOString().split('T')[0] === date
    );

    const hierResult = totalMilk.rows.find(
        row => row.date.toISOString().split('T')[0] === hier
    );

    const totalLaitMaternel = await db.query(`
        SELECT SUM(quantite_lait) AS total_quantite_lait
        FROM donnees
        WHERE DATE(date_donnee) = $1;
    `, [date]);

    const totalUrine = await db.query(`
        SELECT COUNT(*) AS total_urine
        FROM donnees
        WHERE DATE(date_donnee) = $1 AND urine = 'oui';
    `, [date]);

    const totalSelle = await db.query(`
        SELECT COUNT(*) AS total_selle
        FROM donnees
        WHERE DATE(date_donnee) = $1 AND selle = 'oui';
    `, [date]);

    const lastSelleResult = await db.query(`
        SELECT * FROM donnees
        WHERE selle = 'oui'
        ORDER BY date_donnee DESC
        LIMIT 1;
    `);

    const lastMilkResult = await db.query(`
        SELECT * FROM donnees
        WHERE quantite IS NOT NULL
        ORDER BY date_donnee DESC
        LIMIT 1;
    `);

    return {
        aujourdHui: aujourdHui ? Number(aujourdHui.total_quantite) : 0,
        hier: hierResult ? Number(hierResult.total_quantite) : 0,
        quantiteLaitAujourdHui: totalLaitMaternel.rows[0] ? Number(totalLaitMaternel.rows[0].total_quantite_lait) || 0 : 0,
        urineAujourdHui: totalUrine.rows[0] ? Number(totalUrine.rows[0].total_urine) : 0,
        selleAujourdHui: totalSelle.rows[0] ? Number(totalSelle.rows[0].total_selle) : 0,
        lastSelle: lastSelleResult.rows[0] ? lastSelleResult.rows[0].date_donnee : null,
        lastMilk: lastMilkResult.rows[0] ? lastMilkResult.rows[0].date_donnee : null
    };
}



app.get("/posts", async(req, res)=>{

    try {
        const all_posts = await loadPosts();

        res.render("pages/posts.ejs", {posts: all_posts})

    } catch (err) {
        console.log("Erreur lors du chargement des posts :", err);
        res.status(500).send("Erreur serveur");
    }

})







app.get("/posts/:id", async (req, res) => {

    const id = req.params.id;

    try {
        const postResult = await db.query(
            "SELECT * FROM posts WHERE id_post = $1",
            [id]
        );

        if (!postResult.rows[0]) {
            console.log(`Post introuvable pour l'id : ${id}`);
            return res.status(404).redirect("/posts");
        }

        const commentsResult = await db.query(
            "SELECT * FROM comments WHERE id_post = $1",
            [id]
        );

        res.render("pages/post_details", {
            post: postResult.rows[0],
            comments: commentsResult.rows
        });

    } catch (err) {
        console.log("Erreur lors du chargement du post :", err);
        res.status(500).send("Erreur serveur");
    }

});


app.post("/modifier/:id", upload.single("new_file"), async (req, res) => {
  console.log("🔥 POST MODIFIER");
  console.log("ID :", req.params.id);
  console.log("BODY :", req.body);
  console.log("FILE :", req.file);

  try {
    const id = parseInt(req.params.id);

    const new_paragraph = req.body.new_paragraph || null;
    const new_file = req.file;

    // Modification du texte
    if (new_paragraph) {
      await db.query(
        `UPDATE comments
         SET content = $1
         WHERE id_comment = $2`,
        [new_paragraph, id]
      );
    }

    // Modification de l'image
    if (new_file) {
      const new_imagepath = "/uploads/" + new_file.filename;

      await db.query(
        `UPDATE comments
         SET image = $1
         WHERE id_comment = $2`,
        [new_imagepath, id]
      );
    }

    // Récupérer le post auquel appartient le commentaire
    const result = await db.query(
      `SELECT id_post
       FROM comments
       WHERE id_comment = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Commentaire introuvable");
    }

    console.log("POST ID :", result.rows[0].id_post);

    res.redirect(`/posts/${result.rows[0].id_post}`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur dans modification de post");
  }
});





app.get("/", (req, res)=>{
    res.render("pages/accueil")
})


app.get("/accueil", (req, res)=>{
    res.redirect("/")
})


app.get("/enregistrer", (req, res)=>{
    console.log("OK")
    res.render("pages/enregistrer")
})


app.post("/enregistrer", async (req, res) => {
    const { nom, prenom, email, password, confirm_password } = req.body;
    

    if (password !== confirm_password) {
        return res.send("Les mots de passe sont différents");
    }



    try {
        
        const all_users = await db.query(
            "SELECT * FROM users WHERE email = $1", [email]
        );
        
        if (all_users.rows.length > 0) {
            var message = "Email existe déjà"
            return res.render("pages/enregister", {message});
        }

        const hashedPassword = await bcrypt.hash(password, salt);
      
        await db.query(
            "INSERT INTO users(nom, prenom, email, password) VALUES($1, $2, $3, $4)",
            [nom, prenom, email, hashedPassword]
        );

        res.render("pages/connecter.ejs");

    } catch (err) {
        console.log("ERREUR:", err);
        res.status(500).send("Erreur serveur");
    }
});


app.get("/connecter", (req, res)=>{
    res.render("pages/connecter")
})

app.post("/connecter", async (req, res) => {
    const { email, password } = req.body;

    try {
        const current_user = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (current_user.rows.length === 0) {
            let message = "Cet identifiant est inconnu, veuillez vous inscrire";
            return res.render("pages/enregistrer", { message });
        }

        const stored_password = current_user.rows[0].password;

        const isMatch = await bcrypt.compare(password, stored_password);

        if (isMatch) {
            return res.render("pages/accueil");
        } else {
            let message = "Mot de passe incorrect";
            return res.render("pages/connecter", { message });
        }

    } catch (err) {
        console.log(err);
        return res.status(500).send("Erreur serveur");
    }
});


app.get("/nouveau_post", async(req, res)=>{

    try{
        let all_posts2 = await loadPosts();

        const result = await db.query(`select * from users`)

        res.render("pages/nouveau_post.ejs", {users: result.rows, 
            posts: all_posts2
        })

    }catch(err){
        console.log("Erreur lors du chargement de nouveau_post :", err)
        res.status(500).send("Erreur serveur")
    }

})


app.post("/nouveau_post", async(req, res)=>{


    const {user, titre, accroche, date} = req.body;

    console.log(user, titre, accroche)

    try{
       let  result2 = await db.query(`
            insert into posts(id_user, titre, accroche, date) values($1, $2, $3, $4)
            `, [user, titre, accroche, date])


            res.redirect("/nouveau_post")


    }catch(error){
        console.log(error)

    }

})


app.post("/delete_post/:id", async (req, res) => {
    const id = req.params.id;

    try {
        await db.query("DELETE FROM comments WHERE id_post = $1", [id]);
        await db.query("DELETE FROM posts WHERE id_post = $1", [id]);
        res.redirect("/nouveau_post");
    } catch (err) {
        console.log("Erreur lors de la suppression du post :", err);
        res.status(500).send("Erreur lors de la suppression du post");
    }
});


app.get("/post_commentaires",async(req, res)=>{

    try{
        let all_posts2 = await loadPosts();

        const result = await db.query(`select * from users`)

        res.render("pages/nouveau_post.ejs", {users: result.rows, 
            posts: all_posts2
        })

    }catch(err){
        console.log("Erreur lors du chargement de post_commentaires :", err)
        res.status(500).send("Erreur serveur")
    }
})



app.post("/post_commentaires", upload.single("image"), async (req, res) => {

    const post_choisi = req.body.post_choisi
    const commentaire = req.body.commentaire || null
    const current_date = new Date();

    const image = req.file;
    const imagePath = image ? "/uploads/" + image.filename : null;

    try {

        if (commentaire || image) {

            await db.query(
                `INSERT INTO comments (id_post, content, date_comment, image)
                 VALUES ($1, $2, $3, $4)`,
                [post_choisi, commentaire, current_date, imagePath]
            );

        }



        res.redirect("/nouveau_post");

    } catch (error) {
        console.log(error);
        res.send("Erreur lors de l'ajout du commentaire");
    }
});




app.get("/statistique", async(req, res)=>{
    const result = await dailyMilk();

    res.render("pages/statistique.ejs", {result})
});



app.post("/statistique", async (req, res) => {

  const date = req.body.date;

  const quantite = parseInt(req.body.quantite);

  const selle = req.body.selle;
  const urine = req.body.urine;

  const quantite_lait = req.body.quantite_lait
    ? parseFloat(req.body.quantite_lait)
    : null;

  const poids = req.body.poids
    ? parseFloat(req.body.poids)
    : null;

  try {

    await db.query(`
      INSERT INTO donnees
        (date_donnee, quantite, selle, urine, quantite_lait, poids)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      date,
      quantite,
      selle,
      urine,
      quantite_lait,
      poids
    ]);

    res.redirect("/statistique");

  } catch (err) {

    console.error(err);
    res.status(500).send("Erreur dans l'insertion des données");

  }

});












app.listen( port, async()=>{
    console.log(`server is running on port ${port}`);

})