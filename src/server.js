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

// 1. Route TRANG CHỦ (Dashboard tổng quan)
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) AS count FROM students');
        res.render('dashboard', { totalStudents: rows[0].count });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi Server: ${error.message}</h1>`);
    }
});

// 2. Route MỤC SINH VIÊN (Hiển thị Bảng danh sách sinh viên & CRUD)
// 2. Route MỤC SINH VIÊN (Có hỗ trợ tìm kiếm theo Mã SV hoặc Họ Tên)
app.get('/students', async (req, res) => {
    try {
        const keyword = req.query.search || '';
        let query = 'SELECT * FROM students';
        let queryParams = [];

        // Nếu người dùng nhập từ khóa tìm kiếm
        if (keyword) {
            query += ' WHERE student_code LIKE ? OR full_name LIKE ?';
            queryParams = [`%${keyword}%`, `%${keyword}%`];
        }

        const [rows] = await db.query(query, queryParams);
        res.render('students', { students: rows, keyword });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi kết nối CSDL: ${error.message}</h1>`);
    }
});

// Hiển thị form thêm sinh viên
app.get('/add', (req, res) => {
    res.render('add');
});

// Nhận dữ liệu thêm sinh viên và chuyển hướng về trang Danh sách sinh viên (/students)
app.post('/add', async (req, res) => {
    try {
        const { student_code, full_name, email, major } = req.body;
        await db.query(
            'INSERT INTO students (student_code, full_name, email, major) VALUES (?, ?, ?, ?)',
            [student_code, full_name, email, major]
        );
        res.redirect('/students');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi thêm sinh viên: ${error.message}</h1>`);
    }
});

// Hiển thị form chỉnh sửa sinh viên
app.get('/edit/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
        if (rows.length > 0) {
            res.render('edit', { student: rows[0] });
        } else {
            res.status(404).send('Không tìm thấy sinh viên!');
        }
    } catch (error) {
        res.status(500).send(`<h1>Lỗi: ${error.message}</h1>`);
    }
});

// Nhận dữ liệu cập nhật sinh viên và chuyển hướng về /students
app.post('/edit/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { student_code, full_name, email, major } = req.body;
        await db.query(
            'UPDATE students SET student_code = ?, full_name = ?, email = ?, major = ? WHERE id = ?',
            [student_code, full_name, email, major, studentId]
        );
        res.redirect('/students');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi cập nhật sinh viên: ${error.message}</h1>`);
    }
});

// Xóa sinh viên theo ID và chuyển hướng về /students
app.post('/delete/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        await db.query('DELETE FROM students WHERE id = ?', [studentId]);
        res.redirect('/students');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa sinh viên: ${error.message}</h1>`);
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});
// --- QUẢN LÝ THI ĐUA HỌC TẬP ---

app.get('/emulation', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM academic_emulation');
        res.render('emulation', { emulations: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải dữ liệu thi đua: ${error.message}</h1>`);
    }
});

app.get('/emulation/add', (req, res) => {
    res.render('add_emulation');
});

app.post('/emulation/add', async (req, res) => {
    try {
        const { student_code, full_name, gpa, conduct_score, classification } = req.body;
        await db.query(
            'INSERT INTO academic_emulation (student_code, full_name, gpa, conduct_score, classification) VALUES (?, ?, ?, ?, ?)',
            [student_code, full_name, gpa, conduct_score, classification]
        );
        res.redirect('/emulation');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi thêm thi đua: ${error.message}</h1>`);
    }
});

app.post('/emulation/delete/:id', async (req, res) => {
    try {
        const emulationId = req.params.id;
        await db.query('DELETE FROM academic_emulation WHERE id = ?', [emulationId]);
        res.redirect('/emulation');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa thi đua: ${error.message}</h1>`);
    }
});
// --- QUẢN LÝ LỚP HỌC ---

app.get('/classes', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM classes');
        res.render('classes', { classes: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải danh sách lớp: ${error.message}</h1>`);
    }
});

app.get('/classes/add', (req, res) => {
    res.render('add_class');
});

app.post('/classes/add', async (req, res) => {
    try {
        const { class_code, class_name, major } = req.body;
        await db.query(
            'INSERT INTO classes (class_code, class_name, major) VALUES (?, ?, ?)',
            [class_code, class_name, major]
        );
        res.redirect('/classes');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi thêm lớp: ${error.message}</h1>`);
    }
});

app.post('/classes/delete/:id', async (req, res) => {
    try {
        const classId = req.params.id;
        await db.query('DELETE FROM classes WHERE id = ?', [classId]);
        res.redirect('/classes');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa lớp: ${error.message}</h1>`);
    }
});
// --- QUẢN LÝ NGÀNH HỌC ---

app.get('/majors', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM majors');
        res.render('majors', { majors: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải danh sách ngành: ${error.message}</h1>`);
    }
});

app.get('/majors/add', (req, res) => {
    res.render('add_major');
});

app.post('/majors/add', async (req, res) => {
    try {
        const { major_code, major_name, description } = req.body;
        await db.query(
            'INSERT INTO majors (major_code, major_name, description) VALUES (?, ?, ?)',
            [major_code, major_name, description]
        );
        res.redirect('/majors');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi thêm ngành: ${error.message}</h1>`);
    }
});

app.post('/majors/delete/:id', async (req, res) => {
    try {
        const majorId = req.params.id;
        await db.query('DELETE FROM majors WHERE id = ?', [majorId]);
        res.redirect('/majors');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa ngành: ${error.message}</h1>`);
    }
});