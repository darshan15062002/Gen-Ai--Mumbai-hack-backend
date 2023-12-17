const { GoogleAuth } = require("google-auth-library");
const catchAsyncError = require("../middleware/catchAsyncError");
const Quiz = require("../model/quizModal");
const Submission = require("../model/submissionModal");
const pdfParse = require('pdf-parse');
const natural = require('natural');
const { TextServiceClient } =
    require("@google-ai/generativelanguage").v1beta2;



exports.createQuiz = catchAsyncError(async (req, res, next) => {

    console.log(req.body);
    const response = await Quiz.create(req.body);

    res.status(200).json({
        message: 'quiz created successfully',
        response: response
    })

})

exports.updateQuiz = catchAsyncError(async (req, res, next) => {

    const { id } = req.params
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ success: false, message: 'quiz not found' })

    const { title, questions, endDate, visibility } = req.body
    if (title) quiz.title = title
    if (questions) quiz.questions = questions

    if (endDate) quiz.endDate = endDate
    if (visibility !== undefined) {
        quiz.visibility = visibility;
    }
    const response = await quiz.save()
    res.status(200).json({
        success: true,
        response
    })
})


exports.getAllQuiz = catchAsyncError(async (req, res, next) => {

    const quizs = await Quiz.find({}).sort({ createdAt: -1 });
    let docs = []
    if (quizs) {
        for (const item of quizs) {
            try {
                const numberOfSubmissions = await Submission.countDocuments({ quizId: item._id });
                docs.push(numberOfSubmissions)
            } catch (error) {
                console.error(`Error counting submissions for quiz ${item._id}:`, error);
            }
        }
    }

    res.status(200).json({
        success: true,
        quizs,
        docs

    })

})

exports.getAllVisibleQuiz = catchAsyncError(async (req, res, next) => {
    const std = req?.user?.std
    const quizs = await Quiz.find({ visibility: true, std }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        quizs
    })

})

exports.getSingleQuiz = catchAsyncError(async (req, res, next) => {

    const { id } = req.params;
    const quiz = await Quiz.findById(id)

    res.status(200).json({
        success: true,
        quiz
    })

})

exports.deleteQuiz = catchAsyncError(async (req, res, next) => {

    const { id } = req.params;

    const quiz = await Quiz.findById(id)
    console.log(quiz);
    if (!quiz) return res.status(404).json({ success: false, message: 'quiz not found' })

    await Quiz.deleteOne({ _id: quiz._id })
    res.status(200).json({
        success: true,
        message: 'quiz deleted successfully'
    })

})


exports.getAllGeneratedQuizzes = catchAsyncError(async (req, res, next) => {
    const pdfText = req.body.pdf_text;  // Correctly access the PDF text property
    ;
    const noQue = req.body.noQuiz;
    const MODEL_NAME = "models/text-bison-001";
    const API_KEY = process.env.API_KEY;

    if (!pdfText || pdfText.length <= 1000) {
        return res.status(200).json({
            success: true,
            message: "The provided text is not suitable."
        });
    }

    const client = new TextServiceClient({
        authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    // const prompt = `
    // PDF Text: ${pdfText} 
    // Generate ${noQue} multiple-choice questions with four options each based on the provided PDF Text. 
    // and fifth option is the possition of correct answers out of four options like 2
    // Ensure the questions cover various aspects of the text.
    // `

    const prompt = `
    PDF Text: ${pdfText} 
    Generate ${noQue} multiple-choice questions with four options each based on the provided PDF Text. 
    and fifth option is the possition of correct answers out of four options like 2
    Ensure the questions cover various aspects of the text.
    and final result must be it must be in format nothing else :
    What happens when light hits a black hole? ,
    a). It is absorbed.,
    b). It is reflected., 
    c). It is refracted.,
    d). It is scattered.,
    2,
    
    `

    client.generateText({
        model: MODEL_NAME,
        prompt: {
            text: prompt,
        },

    })
        .then((result) => {
            const generatedText = result[0]?.candidates[0]?.output || "No output available";

            // const inputText = generatedText.split(/\s{4,}\d+\.\s/).filter(Boolean);
            const questions = generatedText.split(',').filter(Boolean);

            const array = [];
            for (let i = 0; i < questions.length; i += 6) {
                let doc = {
                    text: questions[i],
                    answers: [
                        questions[i + 1],
                        questions[i + 2],
                        questions[i + 3],
                        questions[i + 4]
                    ],
                    correctAnswer: questions[i + 5].slice(-1),
                };
                array.push(doc);
            }
            console.log(array);


            console.log(questions);

            res.status(200).json({
                success: true,
                array
                // generatedText
            });
        })

});




// --------------------------------------------------------------------------------------------

const extractRelevantText = (pdfText, userConcerns) => {
    const relevantSentences = [];
    const tokenizer = new natural.SentenceTokenizer();


    if (!Array.isArray(userConcerns)) {
        // Handle the case where userConcerns is not an array
        throw new Error('userConcerns must be an array');
    }

    // Tokenize the PDF text into sentences
    const sentences = tokenizer.tokenize(pdfText);

    // Extract sentences containing user concerns
    for (const sentence of sentences) {
        if (userConcerns.some(concern => sentence.toLowerCase().includes(concern.toLowerCase()))) {
            relevantSentences.push(sentence);
        }
    }

    // Join relevant sentences into a single text
    const relevantText = relevantSentences.join(' ');

    return relevantText;
};

const generateQuestions = (pdfText, userConcerns, noQue, apiKey, modelName) => {
    const client = new TextServiceClient({
        authClient: new GoogleAuth().fromAPIKey(apiKey),
    });

    const relevantText = extractRelevantText(pdfText, userConcerns);

    const prompt = `
    PDF Text: ${relevantText} 
    Generate multiple-choice questions with four options each based on the provided PDF Text. 
    and fifth option is the possition of correct answers out of four options like 2
    Ensure the questions cover various aspects of the text.
    and final result must be it must be in format nothing else :
    What happens when light hits a black hole?,
    a). It is absorbed.,
    b). It is reflected., 
    c). It is refracted.,
    d). It is scattered.,
    2,
    `;

    return client.generateText({
        model: modelName,
        prompt: {
            text: prompt,
        },
    })
        .then((result) => {
            const generatedText = result[0]?.candidates[0]?.output || "No output available";
            const questions = generatedText.split(',').filter(Boolean);

            const array = [];
            for (let i = 0; i < questions.length; i += 6) {
                let doc = {
                    text: questions[i],
                    answers: [
                        questions[i + 1],
                        questions[i + 2],
                        questions[i + 3],
                        questions[i + 4],
                    ],
                    correctAnswer: questions[i + 5]?.slice(-1),
                };
                array.push(doc);
            }

            return array;
            // return questions
        });
};

exports.getAllPdfGeneratedQuizzes = catchAsyncError(async (req, res) => {
    const pdfBuffer = Buffer.from(req.file?.buffer);
    // const pdfBuffer = req.file?.buffer;
    const userConcern1 = req.body.userConcerns1
    const userConcern2 = req.body.userConcerns2
    const userConcerns = [userConcern1, userConcern2];
    const noQue = req.body.noQuiz;
    const MODEL_NAME = "models/text-bison-001";
    const API_KEY = process.env.API_KEY;

    try {
        const pdfData = await pdfParse(pdfBuffer);
        const pdfText = pdfData.text;

        const quizQuestions = await generateQuestions(pdfText, userConcerns, noQue, API_KEY, MODEL_NAME);

        res.status(200).json({
            success: true,
            array: quizQuestions,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
        });
    }
})

