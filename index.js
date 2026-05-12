import express from "express"
import bodyParser  from "body-parser"
import pg, { Result } from "pg"
import bcrypt, { hash } from "bcrypt";
import upload from "./upload.js";
import dotenv from "dotenv";
dotenv.config();


const isDev = process.env.NODE_ENV === "development";

const db = new pg.Client({
    connectionString: isDev
        ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@localhost:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`
        : process.env.DATABASE_URL
});

db.connect()
  .then(() => console.log(isDev ? "DB locale connectée ✅" : "DB cloud connectée ☁️"))
  .catch(err => console.log("Erreur DB ❌", err));




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
order by id_post DESC;
 
 `)
 return Posts.rows
}




app.get("/posts", async(req, res)=>{

    const all_posts = await loadPosts();

    res.render("pages/posts.ejs", {posts: all_posts})

})





app.get("/posts/:id", async (req, res) => {

    const id = req.params.id;

    const postResult = await db.query(
        "SELECT * FROM posts WHERE id_post = $1",
        [id]
    );

    const commentsResult = await db.query(
        "SELECT * FROM comments WHERE id_post = $1",
        [id]
    );

    res.render("pages/post_details", {
        post: postResult.rows[0],
        comments: commentsResult.rows
    });

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

    let all_posts2 = await loadPosts();
    
    try{
        const result = await db.query(`select * from users`)

        res.render("pages/nouveau_post.ejs", {users: result.rows, 
            posts: all_posts2
        })

    }catch(err){
        console.log(err)
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


app.get("/post_commentaires",async(req, res)=>{
   let all_posts2 = await loadPosts();

   console.log(all_posts2 )
    
    try{
        const result = await db.query(`select * from users`)

        res.render("pages/nouveau_post.ejs", {users: result.rows, 
            posts: all_posts2
        })

    }catch(err){
        console.log(err)
    }
})



app.post("/post_commentaires", upload.single("image"), async (req, res) => {

    const { post_choisi, commentaire } = req.body;
    const current_date = new Date();

    const image = req.file;
    const imagePath = image ? "/uploads/" + image.filename : null;

    try {

        if (commentaire && commentaire.trim() !== "") {

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












app.listen( port, async()=>{
    console.log(`server is running on port ${port}`);

})