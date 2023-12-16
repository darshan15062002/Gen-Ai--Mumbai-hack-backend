const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser');
const app = express();
const bodyParser = require('body-parser');
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json())
app.use(cookieParser());

const errorMiddleware = require('./middleware/error')

// routes imports

const quiz = require('./routes/quizRoute.js')
const user = require('./routes/userRoute.js')
const summarizer = require('./routes/summarizer.js')
const quizSubmission = require('./routes/submissionRoute.js')

app.use("/api/v1/", quiz)
app.use("/api/v1/", user)
app.use("/api/v1/", summarizer)
app.use("/api/v1/", quizSubmission)
app.use(errorMiddleware)


module.exports = app