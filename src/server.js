import express from 'express';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', './src/views');

// Route trang chủ hiển thị danh sách sinh viên từ MySQL
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students');
        res.render('index', { students: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi truy vấn Database: ${error.message}</h1>`);
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});