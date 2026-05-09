export const bookDetails = {
    id: "FABM01",
    title: "Fundamentals in Business Management and Accountancy",
    category: "Accounting",
    rent: 299.00
};

export const bookContent = `
<!-- ================= UNIT 1: INTRODUCTION ================= -->
<div class="slide" data-type="Theory" data-unit="Unit 1" data-topic="Introduction to Accounting">
    <div class="quiz-container">
        <div class="topic-text">Theory: Unit 1</div>
        <div class="question-text">The Language of Business</div>
        <p style="font-size: 1.2rem; line-height: 1.6; color: #c9d1d9;">Accounting is universally recognized as the "language of business" because it serves as the primary system for communicating financial information about an organization to its stakeholders. Just as spoken languages use structured grammar and vocabulary to share ideas, accounting uses a standardized set of rules...</p>
        <button class="submit-btn" onclick="nextSlide()">Continue to Practice Questions</button>
    </div>
</div>

<div class="slide" id="slide-f1u1q01" data-question-id="f1u1q01" data-type="Question" data-unit="Unit 1" data-difficulty="Easy" data-topic="Introduction to Accounting" data-answer="B" data-points="3">
    <div class="quiz-container">
        <div class="topic-text">Practice: Unit 1 (Easy)</div>
        <div class="question-text">What is often referred to as the language of business?</div>
        <ul style="list-style: none; padding: 0;">
            <li class="mcq-option" onclick="selectOption('f1u1q01', 'A')">A) Economics</li>
            <li class="mcq-option" onclick="selectOption('f1u1q01', 'B')">B) Accounting</li>
            <li class="mcq-option" onclick="selectOption('f1u1q01', 'C')">C) Management</li>
            <li class="mcq-option" onclick="selectOption('f1u1q01', 'D')">D) Marketing</li>
        </ul>
        <input type="hidden" id="input-f1u1q01" value="">
        <button class="submit-btn" id="submit-f1u1q01" onclick="submitAnswer('f1u1q01')">Submit Answer</button>
        <button class="exp-btn" id="exp-f1u1q01" onclick="toggleBookMode()">Show Explanation</button>
        <div class="quiz-feedback" id="feedback-f1u1q01"></div>
    </div>
    <div class="book-content">
        <button class="back-quiz-btn" onclick="toggleBookMode()">← Back to Quiz</button>
        <h2>Explanation</h2>
        <p>Accounting is the correct answer because it translates economic events into financial reports that can be analyzed.</p>
    </div>
</div>

<div class="slide" id="slide-f1u1q02" data-question-id="f1u1q02" data-type="Question" data-unit="Unit 1" data-difficulty="Average" data-topic="The Accounting Equation" data-answer="B" data-points="6">
    <div class="quiz-container">
        <div class="topic-text">Practice: Unit 1 (Average)</div>
        <div class="question-text">Which of the following represents the correct and fundamental accounting equation?</div>
        <ul style="list-style: none; padding: 0;">
            <li class="mcq-option" onclick="selectOption('f1u1q02', 'A')">A) Assets = Liabilities - Equity</li>
            <li class="mcq-option" onclick="selectOption('f1u1q02', 'B')">B) Assets = Liabilities + Equity</li>
            <li class="mcq-option" onclick="selectOption('f1u1q02', 'C')">C) Liabilities = Assets + Equity</li>
            <li class="mcq-option" onclick="selectOption('f1u1q02', 'D')">D) Equity = Assets + Liabilities</li>
        </ul>
        <input type="hidden" id="input-f1u1q02" value="">
        <button class="submit-btn" id="submit-f1u1q02" onclick="submitAnswer('f1u1q02')">Submit Answer</button>
        <button class="exp-btn" id="exp-f1u1q02" onclick="toggleBookMode()">Show Explanation</button>
        <div class="quiz-feedback" id="feedback-f1u1q02"></div>
    </div>
    <div class="book-content">
        <button class="back-quiz-btn" onclick="toggleBookMode()">← Back to Quiz</button>
        <h2>Explanation</h2>
        <p>The equation must balance showing resources (Assets) against their claims (Liabilities + Equity).</p>
    </div>
</div>
`;
