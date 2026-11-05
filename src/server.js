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

// Biến trạng thái đăng nhập đơn giản cho đồ án
let isLoggedIn = false;

// Middleware kiểm tra đăng nhập
const requireLogin = (req, res, next) => {
    if (!isLoggedIn) {
        return res.redirect('/login');
    }
    next();
};

// --- XỬ LÝ ĐĂNG NHẬP & ĐĂNG XUẤT ---
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // Kiểm tra tài khoản mẫu
    if (email === 'admin@student.vn' && password === '123456') {
        isLoggedIn = true;
        res.redirect('/'); // Đăng nhập thành công chuyển về trang chủ
    } else {
        res.redirect('/login'); // Sai thì load lại trang đăng nhập
    }
});

app.get('/logout', (req, res) => {
    isLoggedIn = false; // Xóa trạng thái đăng nhập
    res.redirect('/login');
});

// --- TẤT CẢ CÁC ROUTE BÊN DƯỚI BẮT BUỘC PHẢI ĐĂNG NHẬP MỚI VÀO ĐƯỢC ---

// 1. Route TRANG CHỦ (Dashboard tổng quan & Dữ liệu biểu đồ)
app.get('/', requireLogin, async (req, res) => {
    try {
        const [studentCountRows] = await db.query('SELECT COUNT(*) AS count FROM students');
        const totalStudents = studentCountRows[0].count;

        const [classCountRows] = await db.query('SELECT COUNT(*) AS count FROM classes');
        const totalClasses = classCountRows[0].count;

        const [majorCountRows] = await db.query('SELECT COUNT(*) AS count FROM majors');
        const totalMajors = majorCountRows[0].count;

        const [majorStats] = await db.query(`
            SELECT major, COUNT(*) AS count 
            FROM students 
            GROUP BY major
        `);

        res.render('dashboard', { 
            totalStudents, 
            totalClasses, 
            totalMajors, 
            majorStats 
        });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi Server: ${error.message}</h1>`);
    }
});

// 2. Route MỤC SINH VIÊN
app.get('/students', requireLogin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const offset = (page - 1) * limit;

        let countQuery = 'SELECT COUNT(*) as total FROM students';
        let dataQuery = 'SELECT * FROM students';
        let queryParams = [];

        if (search) {
            countQuery += ' WHERE full_name LIKE ? OR student_code LIKE ?';
            dataQuery += ' WHERE full_name LIKE ? OR student_code LIKE ?';
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const [countResult] = await db.query(countQuery, queryParams);
        const totalRows = countResult[0].total;
        const totalPages = Math.ceil(totalRows / limit) || 1;

        dataQuery += ` LIMIT ${limit} OFFSET ${offset}`;
        const [rows] = await db.query(dataQuery, queryParams);

        res.render('students', {
            students: rows,
            keyword: search,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải danh sách sinh viên: ${error.message}</h1>`);
    }
});

app.get('/add', requireLogin, (req, res) => {
    res.render('add');
});

app.post('/add', requireLogin, async (req, res) => {
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

app.get('/edit/:id', requireLogin, async (req, res) => {
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

app.post('/edit/:id', requireLogin, async (req, res) => {
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

app.post('/delete/:id', requireLogin, async (req, res) => {
    try {
        const studentId = req.params.id;
        await db.query('DELETE FROM students WHERE id = ?', [studentId]);
        res.redirect('/students');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa sinh viên: ${error.message}</h1>`);
    }
});

// --- QUẢN LÝ THI ĐUA HỌC TẬP ---
app.get('/emulation', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM academic_emulation');
        res.render('emulation', { emulations: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải dữ liệu thi đua: ${error.message}</h1>`);
    }
});

app.get('/emulation/add', requireLogin, (req, res) => {
    res.render('add_emulation');
});

app.post('/emulation/add', requireLogin, async (req, res) => {
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

app.post('/emulation/delete/:id', requireLogin, async (req, res) => {
    try {
        await db.query('DELETE FROM academic_emulation WHERE id = ?', [req.params.id]);
        res.redirect('/emulation');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa thi đua: ${error.message}</h1>`);
    }
});

// --- QUẢN LÝ LỚP HỌC ---
app.get('/classes', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM classes');
        res.render('classes', { classes: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải danh sách lớp: ${error.message}</h1>`);
    }
});

app.get('/classes/add', requireLogin, (req, res) => {
    res.render('add_class');
});

app.post('/classes/add', requireLogin, async (req, res) => {
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

app.get('/classes/edit/:id', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM classes WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.render('edit_class', { classItem: rows[0] });
        } else {
            res.status(404).send('Không tìm thấy lớp học!');
        }
    } catch (error) {
        res.status(500).send(`<h1>Lỗi: ${error.message}</h1>`);
    }
});

app.post('/classes/edit/:id', requireLogin, async (req, res) => {
    try {
        const { class_code, class_name, major } = req.body;
        await db.query(
            'UPDATE classes SET class_code = ?, class_name = ?, major = ? WHERE id = ?',
            [class_code, class_name, major, req.params.id]
        );
        res.redirect('/classes');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi cập nhật lớp: ${error.message}</h1>`);
    }
});

app.post('/classes/delete/:id', requireLogin, async (req, res) => {
    try {
        await db.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
        res.redirect('/classes');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa lớp: ${error.message}</h1>`);
    }
});

// --- QUẢN LÝ NGÀNH HỌC ---
app.get('/majors', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM majors');
        res.render('majors', { majors: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải danh sách ngành: ${error.message}</h1>`);
    }
});

app.get('/majors/add', requireLogin, (req, res) => {
    res.render('add_major');
});

app.post('/majors/add', requireLogin, async (req, res) => {
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

app.get('/majors/edit/:id', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM majors WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.render('edit_major', { majorItem: rows[0] });
        } else {
            res.status(404).send('Không tìm thấy ngành học!');
        }
    } catch (error) {
        res.status(500).send(`<h1>Lỗi: ${error.message}</h1>`);
    }
});

app.post('/majors/edit/:id', requireLogin, async (req, res) => {
    try {
        const { major_code, major_name, description } = req.body;
        await db.query(
            'UPDATE majors SET major_code = ?, major_name = ?, description = ? WHERE id = ?',
            [major_code, major_name, description, req.params.id]
        );
        res.redirect('/majors');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi cập nhật ngành: ${error.message}</h1>`);
    }
});

app.post('/majors/delete/:id', requireLogin, async (req, res) => {
    try {
        await db.query('DELETE FROM majors WHERE id = ?', [req.params.id]);
        res.redirect('/majors');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa ngành: ${error.message}</h1>`);
    }
});

// --- QUẢN LÝ THỜI KHÓA BIỂU (TKB) ---
app.get('/timetable', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM timetables');
        res.render('timetable', { timetables: rows });
    } catch (error) {
        res.status(500).send(`<h1>Lỗi tải thời khóa biểu: ${error.message}</h1>`);
    }
});

app.get('/timetable/add', requireLogin, (req, res) => {
    res.render('add_timetable');
});

app.post('/timetable/add', requireLogin, async (req, res) => {
    try {
        const { day_of_week, session, class_name } = req.body;
        await db.query(
            'INSERT INTO timetables (day_of_week, session, class_name) VALUES (?, ?, ?)',
            [day_of_week, session, class_name]
        );
        res.redirect('/timetable');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi thêm TKB: ${error.message}</h1>`);
    }
});

app.post('/timetable/delete/:id', requireLogin, async (req, res) => {
    try {
        await db.query('DELETE FROM timetables WHERE id = ?', [req.params.id]);
        res.redirect('/timetable');
    } catch (error) {
        res.status(500).send(`<h1>Lỗi khi xóa TKB: ${error.message}</h1>`);
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});