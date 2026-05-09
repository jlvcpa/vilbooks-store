export const bookDetails = {
    id: "FABM01",
    title: "Fundamentals in Business Management and Accountancy",
    category: "Accounting",
    rent: 299.00
};

export const bookContent = `
<!-- ================= UNIT 1 ================= -->
<div class="slide" data-type="Theory" data-unit="Unit 1" data-maintopic="I. Introduction to Accounting" data-subtopic="History of Accounting">
    <div class="book-content">
        <h2>History of Accounting</h2>
        <p>Accounting is as old as civilization itself, tracing its roots back to ancient Mesopotamia...</p>
    </div>
</div>

<div class="slide" data-type="Theory" data-unit="Unit 1" data-maintopic="I. Introduction to Accounting" data-subtopic="Definitions of Accounting">
    <div class="book-content">
        <h2>Definitions of Accounting</h2>
        <p>Accounting is often defined as the process of recording, summarizing, and reporting financial transactions...</p>
    </div>
</div>

<div class="slide" id="slide-f1u1q01" data-question-id="f1u1q01" data-type="Question" data-unit="Unit 1" data-maintopic="I. Introduction to Accounting" data-subtopic="Review Questions" data-difficulty="Easy" data-answer="B" data-points="3">
    <div class="quiz-container">
        <div class="topic-text">Review Questions (Easy)</div>
        <div class="question-text">What is often referred to as the language of business?</div>
        <ul style="list-style: none; padding: 0;">
            <li class="mcq-option" onclick="selectOption('f1u1q01', 'A')">A) Economics</li>
            <li class="mcq-option" onclick="selectOption('f1u1q01', 'B')">B) Accounting</li>
        </ul>
        <input type="hidden" id="input-f1u1q01" value="">
        <button class="submit-btn" id="submit-f1u1q01" onclick="submitAnswer('f1u1q01')">Submit Answer</button>
    </div>
</div>

<!-- ================= UNIT 2 (Requires Trial/Rent) ================= -->
<div class="slide" data-type="Theory" data-unit="Unit 2" data-maintopic="II. Branches of Accounting" data-subtopic="Financial vs Managerial">
    <div class="book-content">
        <h2>Financial vs Managerial Accounting</h2>
        <p>Financial accounting is for external users, while managerial accounting is for internal decision making...</p>
    </div>
</div>
`;
