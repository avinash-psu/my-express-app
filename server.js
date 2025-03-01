require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 8000;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// Set up Sequelize with SQLite
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: './database.sqlite'
// });
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.NODE_ENV === 'test' ? ':memory:' : './database.sqlite'
  });
  
// Define models
const User = sequelize.define('User', {
  googleId: {
    type: DataTypes.STRING,
    unique: true
  },
  email: DataTypes.STRING,
  name: DataTypes.STRING
});

const Task = sequelize.define('Task', {
    text: DataTypes.STRING,
    completed: DataTypes.BOOLEAN,
    category: DataTypes.STRING,
    priority: DataTypes.STRING
  });
  
// Set up associations
User.hasMany(Task);
Task.belongsTo(User);

// Sync the database
sequelize.sync();

// Middleware to verify Google token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    req.userId = payload['sub'];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes
app.post('/api/user', verifyToken, async (req, res) => {
  try {
    const [user, created] = await User.findOrCreate({
      where: { googleId: req.userId },
      defaults: {
        email: req.body.email,
        name: req.body.name
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ where: { googleId: req.userId } });
    const tasks = await Task.findAll({ where: { UserId: user.id } });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', verifyToken, async (req, res) => {
    try {
      const user = await User.findOne({ where: { googleId: req.userId } });
      const task = await Task.create({
        text: req.body.text,
        completed: false,
        category: req.body.category,
        priority: req.body.priority,
        UserId: user.id
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
    try {
      const user = await User.findOne({ where: { googleId: req.userId } });
      const [updatedRows] = await Task.update(
        { 
          text: req.body.text, 
          completed: req.body.completed,
          category: req.body.category,
          priority: req.body.priority
        },
        { where: { id: req.params.id, UserId: user.id } }
      );
      if (updatedRows === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      const updatedTask = await Task.findOne({ where: { id: req.params.id, UserId: user.id } });
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ where: { googleId: req.userId } });
    const deletedRows = await Task.destroy({ where: { id: req.params.id, UserId: user.id } });
    if (deletedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const server = () => {
    const port = process.env.PORT || 8000;
    return app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
};
  
if (require.main === module) {
    server();
}
  
// Export the app
module.exports = { app, server };
