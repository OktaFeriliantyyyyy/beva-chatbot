const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

// Ganti nilai berikut sesuai dengan konfigurasi database Anda
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'chatbot_beva',
  password: 'ocha2001',
  port: 5432,
});

app.use(bodyParser.json());

// Endpoint untuk menyimpan data percakapan
app.post('/api/save-conversation', async (req, res) => {
  const { UserId, Nama, email, NoTelepon, TerakhirLogin, JumlahPercakapan } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO tb_user (UserId, Nama, email, NoTelepon, TerakhirLogin, JumlahPercakapan) VALUES ($1, $2, $3, $4, $5, $6)',
      [UserId, Nama, email, NoTelepon, TerakhirLogin, JumlahPercakapan]
    );

    res.json({ success: true, result: result.rows });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Endpoint untuk menyimpan data ulasan
app.post('/api/save-review', async (req, res) => {
  const { Ulasan_id, User_Id, Timestamp, User_Message, Response } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO tb_review (Ulasan_id, User_Id, Timestamp, User_Message, Response) VALUES ($1, $2, $3, $4, $5)',
      [Ulasan_id, User_Id, Timestamp, User_Message, Response]
    );

    res.json({ success: true, result: result.rows });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
