// FABM01/fabm01.js

export const bookDetails = {
    id: "FABM01",
    title: "Fundamentals in Business Management and Accountancy",
    category: "Accounting",
    rent: 299.00
};

export const bookModules = [
    {
        unit: "Unit 1",
        maintopic: "I. Introduction to Accounting",
        subtopic: "History of Accounting",
        type: "Theory",
        sequence: 1, // Determines order
        html: `
            <div class="book-content" style="display:block !important; width:100%;">
                <h2>History of Accounting</h2>
                <p>Accounting is as old as civilization itself...</p>
            </div>
        `
    },
    {
        unit: "Unit 1",
        maintopic: "I. Introduction to Accounting",
        subtopic: "Definitions of Accounting",
        type: "Theory",
        sequence: 2,
        html: `
            <div class="book-content" style="display:block !important; width:100%;">
                <h2>Definitions of Accounting</h2>
                <p>Accounting is the process of identifying, measuring, and communicating...</p>
            </div>
        `
    },
    // ---- UNIT 1: EASY QUESTIONS ----
    {
        unit: "Unit 1",
        maintopic: "I. Introduction to Accounting",
        subtopic: "Review Questions", // Setting this ensures the TOC groups them
        type: "Question",
        difficulty: "Easy",
        sequence: 3,
        questionId: "f1u1q01",
        answer: "B",
        points: 3,
        html: `
            <div class="quiz-container">
                <div class="topic-text">Review Questions (Easy)</div>
                <div class="question-text">What is often referred to as the language of business?</div>
                <ul style="list-style: none; padding: 0;">
                    <li class="mcq-option" onclick="selectOption('f1u1q01', 'A')">A) Economics</li>
                    <li class="mcq-option" onclick="selectOption('f1u1q01', 'B')">B) Accounting</li>
                </ul>
                <input type="hidden" id="input-f1u1q01" value="">
                <button class="submit-btn" id="submit-f1u1q01" onclick="submitAnswer('f1u1q01')">Submit Answer</button>
                <div class="quiz-feedback" id="feedback-f1u1q01"></div>
            </div>
        `
    },
    // ---- UNIT 2: LOCKED CONTENT ----
    {
        unit: "Unit 2",
        maintopic: "II. Branches of Accounting",
        subtopic: "Financial vs Managerial",
        type: "Theory",
        sequence: 4,
        html: `
            <div class="book-content" style="display:block !important; width:100%;">
                <h2>Financial vs Managerial</h2>
                <p>Financial accounting is for external users...</p>
            </div>
        `
    }
];
