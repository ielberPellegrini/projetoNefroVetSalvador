require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const Handlebars = require('handlebars');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'public/img' });
const sequelize = require('./config/database');
const Cliente = require('./models/Cliente');
const User = require('./models/User');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcrypt');
const initializePassport = require('./config/passport-config');
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth');
const moment = require('moment');
const cookieSession = require('cookie-session');


const app = express();

// Configuração da sessão
app.use(session({
    secret: 'secretpassword',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 } // Tempo de expiração em milissegundos (60 segundos)
}));

// Middleware para reiniciar o tempo de expiração da sessão a cada requisição
app.use((req, res, next) => {
    req.session.cookie.expires = new Date(Date.now() + 60000); // Resetar o tempo de expiração
    req.session.cookie.maxAge = 60000; // Também pode ser necessário ajustar o maxAge
    next();
});

// Middleware para verificar a inatividade do usuário
app.use((req, res, next) => {
    const now = Date.now();
    const idleTimeout = 60000; // 60 segundos em milissegundos
    if (req.session.lastAccess && (now - req.session.lastAccess > idleTimeout)) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Erro ao destruir a sessão:', err);
            }
        });
    }
    req.session.lastAccess = now;
    next();
});

// Verifica a inatividade do usuário a cada segundo
setInterval(() => {
    app._router.stack.forEach((middleware) => {
        if (middleware.handle && middleware.handle.lastAccess) {
            const now = Date.now();
            const idleTimeout = 60000; // 60 segundos em milissegundos
            if (now - middleware.handle.lastAccess > idleTimeout) {
                middleware.handle.req.session.destroy((err) => {
                    if (err) {
                        console.error('Erro ao destruir a sessão:', err);
                    }
                });
            }
        }
    });
}, 1000);


//Precisamos definir esse helper manualmente para comparações dentro das views.
//O helper 'eq' é definido para comparar dois valores e retornar true se eles forem iguais.
Handlebars.registerHelper('eq', function (a, b) {
    return a == b;
});

// Definindo o helper "or"
Handlebars.registerHelper('or', function (a, b) {
    return a || b;
});

//Utilizado para formatar a data do cadastro
Handlebars.registerHelper('formatDate', function (date) {
    return moment(date).format('DD/MM/YYYY'); // Formato desejado
});

Handlebars.registerHelper('canRemoveUser', function (loggedInUser, user) {
    if (loggedInUser.id === 1 && user.id !== 1) {
        return true; // Admin pode remover qualquer usuário, exceto o usuário com ID 1
    } else if (loggedInUser.isAdmin && !user.isAdmin) {
        return true; // Admin pode remover usuários não-administradores
    }
    return false; // Caso contrário, não pode remover
});

app.engine('handlebars', engine({
    defaultLayout: 'main',
    handlebars: Handlebars
}));

initializePassport(passport);

app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');


app.use(passport.initialize());
app.use(passport.session());

// Serialização e desserialização do usuário deslogando o usuário depois do tempo estipulado
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

const transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    debug: true, // Habilita logs de debug
});

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
});

//Verificação de login onde, se quem logou foi Admin, ele vai para o rota users, se quem logou foi um funcionário cadastrado, vai para a rota funcionario
app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            // Verifica se o usuário é admin
            if (user.isAdmin) {
                return res.redirect('/users');
            } else {
                return res.redirect('/funcionario');
            }
        });
    })(req, res, next);
});

//Rota de logout
app.get('/logout', (req, res) => {
    req.logout(() => {}); // Faz o logout do usuário
    res.redirect('/login'); // Redireciona para a página de login
});

app.get('/cadastro', ensureAdmin, (req, res) => {
    res.render('cadastro');
});

// Rota de cadastro de usuários
app.post('/cadastro', async (req, res) => {
    const { email, password, isAdmin } = req.body;
    
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        email,
        password: hashedPassword,
        isAdmin: isAdmin ? true : false
      });
      res.redirect('/users');
    } catch (err) {
      console.error('Erro ao cadastrar usuário:', err);
      res.status(500).send('Erro ao cadastrar usuário');
    }
  });

// app.get('/users', async (req, res) => {
//     // Verifique se o usuário está autenticado e é um administrador
//     if (!req.user || !req.user.isAdmin) {
//       return res.redirect('/login');
//     }
  
//     try {
//       // Buscar todos os usuários exceto o admin
//       const users = await User.findAll({
//         where: { isAdmin: false },
//         raw: true
//       });
//       console.log('Usuários encontrados:', users); // Log para depuração
//       res.render('users', { users });
//     } catch (err) {
//       console.error('Erro ao buscar usuários:', err);
//       res.status(500).send('Erro ao buscar usuários');
//     }
//   });

// Rota para remover um usuário pelo ID (protegida para admin)
// app.post('/remover-users/:id', async (req, res) => {
//     if (!req.user || !req.user.isAdmin) {
//       return res.redirect('/login');
//     }
  
//     try {
//       const userId = req.params.id;
//       await User.destroy({ where: { id: userId } });
//       res.redirect('/users');
//     } catch (err) {
//       console.error('Erro ao remover usuário:', err);
//       res.status(500).send('Erro ao remover usuário');
//     }
//   });

// Rota para exibir todos os usuários
app.get('/users', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
      return res.redirect('/login');
    }
  
    try {
      const users = await User.findAll({
        where: {},
        raw: true
      });
      res.render('users', { users, user: req.user });
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      res.status(500).send('Erro ao buscar usuários');
    }
});

// Rota para remover um usuário pelo ID (protegida para admin)
app.post('/remover-users/:id', async (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }
  
    try {
      const userId = parseInt(req.params.id);
      const loggedInUser = req.user;

      if (userId === 1) {
        return res.status(403).send('Você não pode remover o usuário com id 1.');
      }

      if (loggedInUser.id === 1) {
        await User.destroy({ where: { id: userId } });
        return res.redirect('/users');
      }

      if (loggedInUser.isAdmin && !await User.findByPk(userId).isAdmin) {
        await User.destroy({ where: { id: userId } });
        return res.redirect('/users');
      }

      return res.status(403).send('Você não tem permissão para remover este usuário.');
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      res.status(500).send('Erro ao remover usuário.');
    }
});

// Rota para exibir informações do funcionário logado
app.get('/funcionario', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, { raw: true });
        res.render('funcionario', { user });
    } catch (err) {
        console.error('Erro ao buscar usuário:', err);
        res.status(500).send('Erro ao buscar usuário');
    }
});

app.get('/contato', (req, res) => {
    res.render('contato');
});

app.get('/blog1', (req, res) => {
    res.render('blog1');
});

app.get('/blog2', (req, res) => {
    res.render('blog2');
});

app.get('/blog3', (req, res) => {
    res.render('blog3');
});

app.get('/sobremim', (req, res) => {
    res.render('sobremim');
});

app.get('/servicosnefro', (req, res) => {
    res.render('servicosnefro');
});

app.get('/dogbreeds', async (req, res) => {
    const query = req.query.q;

    try {
        const response = await axios.get('https://api.thedogapi.com/v1/breeds', {
            headers: {
                'x-api-key': process.env.DOG_API_KEY
            }
        });
        let dogBreeds = response.data;

        if (query) {
            dogBreeds = dogBreeds.filter(breed => breed.name.toLowerCase().includes(query.toLowerCase()));
        }

        
        const temperamentosTraduzidos = {
            'Friendly': 'Amigável',
            'Energetic': 'Enérgico',
            'Alert': 'Alerta',
            'Gentle': 'Gentil',
            'Playful': 'Brincalhão',
            'Devoted': 'Devotado',
            'Loyal': 'Leal',
            'Independent': 'Independente',
            'Affectionate': 'Afeição',
            'Intelligent': 'Inteligente',
            'Active': 'Ativo',
            'Confident': 'Confiante',
            'Outgoing': 'Extrovertido',
            'Wild': 'Selvagem',
            'Aloof': 'Indiferente',
            'Clownish': 'Palhaço',
            'Happy': 'Feliz',
            'Curious': 'Curioso',
            'Adventurous':'Aventureiro',
            'Fun-loving': 'Ama Diversão',
            'Hardworking': 'Trabalha Duro',
            'Dutiful': 'Obediente',
            'Brave': 'Corajoso',
            'Dignified': 'Digno',
            'Protective': 'Protetor',
            'Composed': 'Composto',
            'Faithful': 'Fiel',
            'Courageous': 'Corajoso',
            'Receptive': 'Receptivo',
            'Trainable': 'Treinável',
            'Reserved': 'Reservado',
            'Loving': 'Amoroso',
            'Strong Willed': 'Obstinado',
            'Stubborn': 'Teimoso',
            'Assertive': 'Assertivo',
            'Dominant': 'Dominante',
            'Kind': 'Gentil',
            'Sweet-Tempered': 'Temperamento Doce',
            'Obedient': 'Obedient',
            'Eager': 'Ansioso',
            'Steady': 'Estável',
            'Protetor': 'Protetor',
            'Bold': 'Audacioso',
            'Proud': 'Orgulhoso',
            'Reliable': 'Confiável',
            'Lively': 'Vivaz',
            'Self-assured': 'Autoconfiante',
            'Good-natured': 'Bem humorado',
            'Spirited': 'Espirituoso',
            'Companionable': 'Companheiro',
            'Even Tempered' : 'Mesmo temperado',
            'Rugged': 'Áspero',
            'Fierce': 'Feroz',
            'Refined': 'Refinado',
            'Joyful': 'Alegre',
            'Excitable': 'Exitável',
            'Determined': 'Determinado',
            'Self-confidence': 'Autoconfiante',
            'Hardy': 'Resistente',
            'Calm': 'Calmo',
            'Good-tempered': 'Bem humorado',
            'Fearless': 'Destemido',
            'Trusting': 'Confiável',
            'Adaptable': 'Adaptável',
            'Lovable': 'Adorável',
            'Hard-working': 'Trabalha duro',
            'Watchful': 'Vigilante',
            'Attentive': 'Atento',
            'Sensitive': 'Sensivel',
            'Cheerful': 'Alegre',
            'Easygoing': 'Maleável',
            'Obedient': 'Obediente',
            'Feisty': 'Mal-humorado',
            'Tenacious': 'Persistente',
            'Keen': 'Ansioso',
            'Rational': 'Racional',
            'Familial': 'Familiar',
            'Bright': 'Brilhante',
            'Gay': 'Alegre',
            'Powerful': 'Poderoso',
            'Quick': 'Rápido',
            'Stable': 'Do Campo',
            'Quiet': 'Silencioso',
            'Inquisitive': 'Inquisitivo',
            'Sociable': 'Sociável',
            'Patient': 'Paciente',
            'Great-hearted': 'De grande coração',
            'Merry': 'Alegre',
            'People-Oriented': 'Orienta Pessoas',
            'Bossy': 'Mandão',
            'Cunning': 'Ardiloso'

        };

        dogBreeds = dogBreeds.map(breed => {
            
            let temperamentos = breed.temperament ? breed.temperament.split(', ').map(temp => temperamentosTraduzidos[temp] || temp).join(', ') : 'Desconhecido';
            
            let expectativaVida = breed.life_span ? breed.life_span.replace('years', 'anos').replace(' - ', ' a ') : 'Desconhecida';

            return {
                nome: breed.name,
                temperamento: temperamentos,
                expectativaVida: expectativaVida,
                imagem: breed.image.url
            };
        });

        res.render('dogbreeds', { breeds: dogBreeds, query });
    } catch (error) {
        console.error('Erro ao obter dados das raças de cães:', error.message);
        res.status(500).send('Erro ao obter dados das raças de cães.');
    }
});


app.post('/contato', upload.single('imagem'), async (req, res) => {
    const { nome, email, telefone, endereco, motivo } = req.body;
    const imagem = req.file ? req.file.path : null;

    try {
        const cliente = await Cliente.create({
            nome,
            email,
            telefone,
            endereco,
            motivo,
            imagem,
        });

        const attachments = [];
        if (imagem) {
            const imageBuffer = fs.readFileSync(path.resolve(imagem));
            attachments.push({
                filename: req.file.originalname,
                content: imageBuffer,
                contentType: req.file.mimetype
            });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Contato recebido',
            text: `Obrigado por entrar em contato, ${nome}. Logo iremos te responder! \n\nDetalhes:\nNome: ${nome}\nEmail: ${email}\nTelefone: ${telefone}\nEndereço: ${endereco}\nMotivo: ${motivo}`,
            attachments: attachments
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erro ao enviar o e-mail:', error);
            } else {
                console.log('E-mail enviado:', info.response);
            }
        });

        res.render('contato', { clientes: [cliente], emailSent: true });
    } catch (error) {
        console.error('Erro ao salvar os dados do cliente:', error);
        res.status(500).send('Erro ao salvar os dados do cliente.');
    }
});

sequelize.sync()
    .then(() => {
        app.listen(3000, () => {
            console.log('Servidor funcionando na porta http://localhost:3000/');
        });
    })
    .catch(err => console.error('Erro ao sincronizar com o banco de dados:', err));