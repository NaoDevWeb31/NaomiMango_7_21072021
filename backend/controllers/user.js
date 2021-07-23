// Import des packages dans le contrôleur
const mysql = require("mysql"); // Interagir avec une base de données MySQL en Node
const bcrypt = require("bcrypt"); // Chiffre et crée un hash des mdp
const jwt = require("jsonwebtoken"); // Créer des tokens et les vérifie

// Import de la configuration de la base de données dans le contrôleur
const db = require("../database/db-config");

exports.signup = (req, res, next) => {
    const lastName = req.body.lastName;
    const firstName = req.body.firstName;
    const email = req.body.email;
    const password = req.body.password;

    // Chiffrer le mdp
    bcrypt
        // Hacher le mdp et le saler 10 fois
        .hash(password, 10)
        // Recevoir le hash généré
        .then(hash => {
            // Préparer la requête SQL pour créer un utilisateur
            let sql = "INSERT INTO users (last_name, first_name, email, password) VALUES (?, ?, ?, ?)";
            // Insérer les valeurs du corps de la requête POST dans la requête SQL
            let inserts = [lastName, firstName, email, hash];
            // Assembler la requête d'insertion SQL finale
            sql = mysql.format(sql, inserts);
            // Effectuer la requête auprès de la base de données
            db.query(sql, function (error, result) {
                if (error) {
                    console.log("Il y a une erreur :" + error)
                    return res.status(400).json({ error })
                } else {
                    console.log("Utilisateur créé !")
                    return res.status(201).json({ message: "Utilisateur créé !" })
                }
            });
        })
        .catch(error => res.status(500).json({ error }));
};

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    
    // Préparer la requête SQL pour récupérer un utilisateur
    let sql = "SELECT id, email, password, admin_role FROM users WHERE email = ?";
    // Insérer les valeurs du corps de la requête POST dans la requête SQL
    let inserts = [email];
    // Assembler la requête d'insertion SQL finale
    sql = mysql.format(sql, inserts);
    // Effectuer la requête auprès de la base de données
    db.query(sql, function (error, result) {
        // Si l'utilisateur ne correspond pas à un utilisateur existant de la base de données
        if (result === "" || result == undefined) {
            console.log(error)
            return res.status(401).json({ error: "Utilisateur introuvable !" });
        }
        console.log(result);
        // Si l'utilisateur correspond
        bcrypt
        // Comparer le mdp saisi avec le hash enregistré dans la base de données
            .compare(password, result[0].password)
            .then(valid => {
                // Si le mdp saisi ne correspond pas
                if (!valid) {
                    console.log("Tentative de connexion de l'utilisateur " + req.body.email + " mais mot de passe incorrect !");
                    return res.status(401).json({ error: "Mot de passe incorrect !" });
                }
                // Si le mdp saisi correspond, renvoyer l'identifiant userID et un token (jeton Web JSON) au front-end
                res.status(200).json({
                    userId: result[0].id,
                    // Encoder un nouveau token
                    token: jwt.sign(
                        // Contenant l'identifiant et le rôle administrateur  en tant que payload (les données encodées dans le token)
                        { userId: result[0].id, adminRole: result[0].admin_role },
                        // En utilisant une chaîne secrète de développement temporaire (à remplacer par une chaîne aléatoire beaucoup plus longue)
                        "RANDOM_TOKEN_SECRET",
                        // En définissant la durée de validité du token (se reconnecter au bout de 24 heures)
                        { expiresIn: "2h" }
                    )
                });
                console.log("L'utilisateur " + req.body.email+ " ayant l'userId " + result[0].id + " est désormais connecté !");
            })
            .catch(error => res.status(500).json({ error }));
    });
};