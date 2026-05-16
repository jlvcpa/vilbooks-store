// FABM02/fabm02.js

export const bookDetails = {
    id: "FABM02",
    title: "Fundamentals in Business Management and Accountancy 2",
    category: "Accounting",
    rent: 299.00
};

export const bookModules = [
    {
        unit: "Unit 1",
        maintopic: "I. Statement of Financial Position",
        subtopic: "Elements of the SFP",
        type: "Theory",
        sequence: 1, // Determines order
        html: `
            <div class="book-content" style="display:block !important; width:100%;">
                <h2>Elements of the Statement of Financial Position</h2>
                <p>The Statement of Financial Position, also known as the balance sheet, presents the financial position of an entity at a given date. It is comprised of three main elements: Assets, Liabilities, and Equity.</p>
            </div>
        `
    },
    {
        unit: "Unit 1",
        maintopic: "I. Statement of Financial Position",
        subtopic: "Report Form vs. Account Form",
        type: "Theory",
        sequence: 2,
        html: `
            <div class="book-content" style="display:block !important; width:100%;">
                <h2>Report Form vs. Account Form</h2>
                <p>The SFP can be presented in two formats. The Report Form lists assets, liabilities, and equity in a single vertical column. The Account Form presents assets on the left side and liabilities and equity on the right side, mimicking the double-entry accounting equation.</p>
            </div>
        `
    },
    // ---- UNIT 1: EASY QUESTIONS ----
    {
        unit: "Unit 1",
        maintopic: "I. Statement of Financial Position",
        subtopic: "Review Questions", // Setting this ensures the TOC groups them
        type: "Question",
        difficulty: "Easy",
        sequence: 3,
        questionId: "f2u1q01",
        answer: "A",
        points: 3,
        html: `
            <div class="quiz-container">
                <div class="topic-text">Review Questions (Easy)</div>
                <div class="question-text">Which of the following financial statements shows the financial position of a business as of a specific date?</div>
                <ul style="list-style: none; padding: 0;">
                    <li class="mcq-option" onclick="selectOption('f2u1q01', 'A')">A) Statement of Financial Position</li>
                    <li class="mcq-option" onclick="selectOption('f2u1q01', 'B')">B) Statement of Comprehensive Income</li>
                    <li class="mcq-option" onclick="selectOption('f2u1q01', 'C')">C) Statement of Cash Flows</li>
                    <li class="mcq-option" onclick="selectOption('f2u1q01', 'D')">D) Statement of Changes in Equity</li>
                </ul>
                <input type="hidden" id="input-f2u1q01" value="">
                <button class="submit-btn" id="submit-f2u1q01" onclick="submitAnswer('f2u1q01')">Submit Answer</button>
                <div class="quiz-feedback" id="feedback-f2u1q01"></div>
            </div>
        `
    },
    // ---- UNIT 2: LOCKED CONTENT ----
    {
        unit: "Unit 2",
        maintopic: "II. Statement of Comprehensive Income",
        subtopic: "Nature and Elements of SCI",
        type: "Theory",
        sequence: 4,
        html: `
            <div class="book-content" style="display:block !important; width:100%;">
                <h2>Nature and Elements of SCI</h2>
                <p>The Statement of Comprehensive Income (SCI) details the financial performance of a company over a specific accounting period. It bridges the gap between the beginning and ending balances of retained earnings by detailing revenues and expenses.</p>
            </div>
        `
    }
];
