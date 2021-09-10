const fastify = require("fastify")({ logger: true });

const stripe = require("stripe")(
  "sk_test_51J7zwCDsZuAa1t1GUloKFJVJN6ULfc1waS2yTOlmkrVeBMiH2OjiAWCPmJtq6wfbZcKZOOr2pJAaxaHlGEPj9EM000Ue84UQhL"
);

const filePath = "/Users/moshe/Downloads/projeteitan/server/uploads";

fastify.register(require("fastify-static"), {
  root: filePath,
  prefix: "/uploads/",
});

fastify.register(require("fastify-cors"), { origin: "*", methods: [""] });

fastify.register(require("fastify-mysql"), {
  promise: true,
  connectionString: "mysql://root:Tagidi26@localhost/wezen",
});

fastify.register(require("fastify-jwt"), {
  secret: '{Hxa~J{cSY6uHJ74TjGX=)3Xg@#L{y^UP~zC"8D',
});

fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: "neweitan.hayat@gmail.com",
    pass: "Eitanlea123",
  },
});

transporter.verify().then(console.log).catch(console.error);

const md5 = require("md5");
const fs = require("fs");
var uuid = require("uuid");

fastify.post("/login", async (req, reply) => {
  const cnx = await fastify.mysql.getConnection();

  console.log(req.body);
  if (!req.body.email || !req.body.password) {
    reply.code(401).send("");
  }

  const mdpass = md5(req.body.password);
  const [result, fields] = await cnx.query(
    `SELECT * From user where Comfirmaccount is null and (email = '${req.body.email}' || username = '${req.body.email}') && passsword = '${mdpass}' `,
    []
  );
  cnx.release();

  console.log(result[0]);

  if (result.length > 0) {
    const token = fastify.jwt.sign({
      id: result[0].id,
      isadmin: result[0].admin === 1,
    });
    console.log(JSON.stringify(result));
    reply.code(200).send(token);
  } else {
    reply.code(401).send("");
  }
});

fastify.get("/validate", async (req, reply) => {
  const cnx = await fastify.mysql.getConnection();

  const [result, fields] = await cnx.query(
    `update user set Comfirmaccount=null where Comfirmaccount='${req.query.id}'`,
    []
  );

  cnx.release();

  reply.redirect("http://localhost:3000");
});

fastify.post("/register", async (req, reply) => {
  console.log(req.body);

  const cnx = await fastify.mysql.getConnection();

  const mdpass = md5(req.body.password);
  const mail = req.body.email;
  const username = req.body.Username;
  const comfirmPassword = md5(req.body.comfirmpassword);

  if (mdpass === comfirmPassword) {
    let buff = Buffer.from(req.body.image.split(";base64,").pop(), "base64");
    const fileName = `${uuid.v4()}.png`;
    fs.writeFileSync(`${filePath}/${fileName}`, buff);

    const guid = uuid.v4();

    const link = `<a href=http://localhost:3001/validate?id=${guid}>Cliquez ici</a>`;

    const [result, fields] = await cnx.query(
      `INSERT INTO user(username, email, passsword,img, Comfirmaccount) VALUES ('${username}', '${mail}','${mdpass}','${fileName}','${guid}')`,
      []
    );

    cnx.release();

    reply.send(result);
    if (result != 0) {
      transporter.sendMail({
        from: '"The reseller 2.0 ✌️ " neweitan.hayat@gmail.com', // sender address
        to: `${mail}`, // list of receivers
        subject: "New register", // Subject line
        text: "Bonjour veuiller comfirmez votre compte afin de pouvoir naviguer sur notre plateforme ", // plain text body
        html: `<b>Bonjour veuiller comfirmez votre compte afin de pouvoir naviguer sur notre plateforme</b>${link}`, // html body
      });
    }
  }
});

fastify.get(
  "/quisommenous",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const [result, fields] = await cnx.query("SELECT * FROM quisommenous");

    cnx.release();
    reply.send(result);
  }
);

fastify.get(
  "/messageadmin",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const [result, fields] = await cnx.query("SELECT * FROM ContactezNous");

    cnx.release();
    reply.send(result);
  }
);

fastify.get(
  "/account",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const [rows, fields] = await cnx.query(
      "SELECT * FROM user WHERE id='" + req.user.id + "'"
    );

    cnx.release();
    reply.send(rows);
  }
);

fastify.get(
  "/Products",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const [result, fields] = await cnx.query(
      `SELECT * FROM product WHERE categoryId = ${req.query.id}`
    );

    cnx.release();
    reply.send(result);
    console.log(result);
  }
);

fastify.post(
  "/macommande",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();
    try {
      const basket = req.body.macommande.basket;
      const contact = req.body.macommande.contact;

      let total = 0;
      let totalQte = 0;
      for (let i = 0; i < basket.length; i++) {
        let art = basket[i];
        total += art.prix;
        totalQte += art.qte;
      }

      console.log(total);
      console.log(totalQte);

      const [result, fields] = await cnx.query(
        `INSERT INTO commande(total, nbr_article, userid, addresse) VALUES (${total}, ${totalQte}, ${req.user.id}, '${contact.name} ${contact.adresse} ${contact.phone}')`,
        []
      );

      const cmdId = result.insertId;
      console.log(cmdId);

      for (let i = 0; i < basket.length; i++) {
        let art = basket[i];
        await cnx.query(
          `INSERT INTO articles(id_commande, id_product, price, quantity) VALUES (${cmdId}, ${art.id}, ${art.prix}, ${art.qte})`,
          []
        );
      }

      reply.send(1);
    } catch (e) {
      console.log(e);
      reply.send(0);
    } finally {
      cnx.release();
    }
  }
);

fastify.post(
  "/updateaccount",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const username = req.body.Username;
    const mail = req.body.email;

    let sql = `UPDATE user SET username = '${username}', email= '${mail}'`;
    if (req.body.password !== "") {
      const password = md5(req.body.password);
      sql += ` ,passsword='${password}'`;
    }

    if (req.body.isChange) {
      let buff = Buffer.from(req.body.image.split(";base64,").pop(), "base64");
      const fileName = `${uuid.v4()}.png`;
      fs.writeFileSync(`${filePath}/${fileName}`, buff);

      sql += ` ,img = '${fileName}'`;
    }

    sql += ` where id = ${req.user.id}`;

    console.log(sql);

    await cnx.query(sql, []);

    cnx.release();
    reply.redirect("/account");
  }
);

fastify.get(
  "/StreetwearDecouvrire",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    cosnt[(reusult, fields)] = await cnx.query(
      "SELECT * FROM product where categoryId=2"
    );

    cnx.release();
    reply.send(result);
    console.log(result);
  }
);

fastify.post(
  "/NousContacter",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const nom = req.body.Nom;
    const mail = req.body.Mail;
    const message = req.body.Message;

    const [result, fields] = await cnx.query(
      `INSERT INTO ContactezNous( Nom, Mail, Message) VALUES ('${nom}', '${mail}','${message}')`,
      []
    );
    cnx.release();
    reply.send(result);
  }
);

// partie admin

fastify.get(
  "/Useradmin",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const [result, fields] = await cnx.query("SELECT * FROM user");
    cnx.release();
    reply.send(result);
    console.log(result);
  }
);

fastify.post(
  "/deleteaccount",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const id = req.body.productId;
    const [result, fields] = await cnx.query(
      `DELETE FROM user where id = ${id}`,
      []
    );

    cnx.release();
    reply.send(result);
  }
);

fastify.post(
  "/deleteproduct",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const id = req.body.productId;
    const [result, fields] = await cnx.query(
      `DELETE FROM product where id = ${id}`,
      []
    );

    cnx.release();
    reply.send(result);
  }
);

fastify.post(
  "/updateproduct",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();

    const title = req.body.Title;
    const subtitle = req.body.Subtitle;
    const price = req.body.Prix;
    const id = req.body.updateproductId;

    const [result, fields] = await cnx.query(
      `UPDATE product SET title = '${title}', subtitle= '${subtitle}', prix =${price} where id = ${id}`,
      []
    );
    cnx.release();
    reply.send(result);
  }
);

fastify.post(
  "/pay",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    console.log(parseInt(req.body.price));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.price * 100,
      currency: "usd",
    });

    reply.send({ clientSecret: paymentIntent.client_secret });
  }
);

fastify.post(
  "/addproduct",
  {
    preValidation: [fastify.authenticate],
  },
  async (req, reply) => {
    const cnx = await fastify.mysql.getConnection();
    const Title = req.body.Title;
    const SubTitle = req.body.SubTitle;
    const Prix = req.body.Prix;
    const Id = req.body.Id;

    let buff = Buffer.from(req.body.image.split(";base64,").pop(), "base64");
    const fileName = `${uuid.v4()}.png`;
    fs.writeFileSync(`${filePath}/${fileName}`, buff);

    const [result, fields] = await cnx.query(
      `INSERT INTO product( title, subtitle, prix,img,categoryId) VALUES ('${Title}', '${SubTitle}',${Prix},'${fileName}','${Id}')`
    );
    cnx.release();
    reply.send(result);
  }
);

// Run the server!
const start = async () => {
  try {
    await fastify.listen(3001);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
