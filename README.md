# Nefro Vet Salvador - Nefrologia Veterinária Salvador

Bem-vindo a aplicação da Nefro Vet Salvador! Este projeto foi criado para apresentar um cartão de visita para a cliente veterinári incluindo detalhes sobre a mesma, marcação de consulta através de direcionamento para o whatsapp e uma funcionalidade para enviar emails através do Nodemailer.

## Tecnologias Utilizadas
-axios:
-bcrypt:
-body-parser:
-cookie-session: 
-dotenv:
-express:
-express-handlebars: 
-express-session:
-moment:
-multer:
-mysql2: 
-nodemailer:
-passport: 
-passport-local: 
-pg:
-sequelize:
-HTML:
-CSS:

## Funcionalidades
- Blog no início: Mostra algums artigos em formato de blog para que o usuário possa verificar assuntos referentes a nefrológia veterinária.
- Sobre a Veterinária: Informações detalhadas sobre a Veterinária.
- Serviços Nefro: Mostra quais os serviços são oferecidos junto com a opção de entrar em contato com a mesma.
- Formulário de Contato: Permite que os usuários enviem mensagens diretamente para a empresa e recebendo um feedback que o contato foi recebido no seu email utilizando o Nodemailer.
- Integração com API "Dog Breeds": API sobre curiosidades sobre algumas raças de cachorro.

## Passos de Instalação
1. Clone o repositório para sua máquina local:
```
Pasta Disponível Aqui
```

2. Navegue até o diretório do projeto:
```
cd 
```
3. Instale as dependências do projeto usando npm:
```
npm install
```
4. Configure as variáveis de ambiente para o Nodemailer no arquivo .env
```
EMAIL_USER
EMAIL_PASS

DOG_API_KEY

ADMIN_EMAIL
ADMIN_PASSWORD
```
5. Execute a aplicação:
```
npm start
npx nodemon .\app.js
node ./createAdmin.js
npx nodemon .\app.js
```
6. Abra o navegador e acesse:
```
http://localhost:3000
```