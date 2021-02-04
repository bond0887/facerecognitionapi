const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');

const app = express();
app.use(bodyParser.json());
app.use(cors())


var corsOptions = {
  origin: 'https://lit-ocean-96596.herokuapp.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


const db = knex({
	client: 'pg',
	connection:{
		connectionString:'process.env.DATABASE_URL',
		ssl: { rejectUnauthorized: false }
	}
});

app.get('/',(req,res)=>{
	res.json('it is working')
})


app.post('/signin', (req,res)=>{
	db.select('email','hash').from('login')
	.where('email','=',req.body.email)
	.then(data => {
		const isvalid = bcrypt.compareSync(req.body.password,data[0].hash);
	if(isvalid){
		return db.select('*').from('users')
		.where('email','=',req.body.email)
		.then(user =>{
			res.json(user[0])
		})
		.catch(err => res.status(400).json('unable to get user'))
	}
	else{
		res.status(400).json('wrong credentials')
	}
	})
	.catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register',(req,res)=>{
	const {name,email,password} = req.body;
	if(!email || !name || !password){
		return res.status(400).json('Incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	 db.transaction(trx => {
	 		trx.insert({
	 			hash:hash,
	 			email:email
	 		})
	 		.into('login')
	 		.returning('email')
	 		.then(loginEmail => {
	 			return trx('users')
					.returning('*')
					.insert({
						email:loginEmail[0],
						name:name,
						joined:new Date()
					})
					.then(user => {
						res.json(user[0]);
					})
	 		})
	 		.then(trx.commit)
	 		.catch(trx.rollback)
	 })
	.catch(err => res.status(400).json(err))
})

app.get('/profile/:id',(req,res)=>{
	const {id} = req.params;
	db.select('*').from('users').where({
		id:id
	})
	.then(user =>{
		if(user.length){
		res.json(user[0]);	
		}
		else{
			res.status(400).json('Not found')
		}	
	})
	.catch(err=>res.status(400).json('Error getting user'))
})

app.put('/images',(req,res)=>{
	const {id} = req.body;
	db('users').where('id','=',id)
	.increment('entries',1)
	.returning('entries')
	.then(entries =>{
		res.json(entries[0]);
	})
	.catch(err => res.status(400).json('Oops, something wrong in images'))
})



app.listen(process.env.PORT || 3000, () => {
	console.log(`app is running on port ${process.env.PORT}`)
})