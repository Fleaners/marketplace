const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const webAppPath = path.join(__dirname, '..', 'web_app');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/api/status', (req, res) => {
  res.json({ message: 'DealerConnect backend is running' });
});

if (fs.existsSync(webAppPath)) {
  app.use(express.static(webAppPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webAppPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'DealerConnect backend is running' });
  });
}

app.use(errorHandler);
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DealerConnect backend listening on port ${PORT}`);
    if (fs.existsSync(webAppPath)) {
      console.log(`Static web_app available at http://127.0.0.1:${PORT}/`);
    }
  });
}

module.exports = app;
