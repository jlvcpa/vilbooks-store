// app.js
import { collection, query, getDocs, orderBy, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { db, loginUser } from './auth.js';

// Import Books (The books now export an array of module objects)
import { bookDetails as fabm01Details, bookModules as fabm01Modules } from './FABM01/fabm01.js';
import { bookDetails as fabm02Details, bookModules as fabm02Modules } from './FABM02/fabm02.js';

window.availableBooks = [
    { details: fabm01Details, modules: fabm01Modules }
    { details: fabm02Details, modules: fabm02Modules }

];

window.currentUser = null;
window.currentSlideIndex = 0;
window.slides = []; 
window.timerInterval = null;
window.narrationTimeout = null; 
window.activityName = "VilBooks Practice";
window.section = "Default"; 
window.studentAnswers = {}; 
window.celebratedSets = new Set(); 
window.userSubscriptions = []; 
window.unitTrials = {}; 
window.pendingTrialUnit = null;
window.pendingTrialIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    populateBookDropdown();
});

document.addEventListener('click', function(event) {
    const nav = document.getElementById('slide-navigator');
    const navBtn = document.getElementById('nav-toggle-btn');
    if (nav && !nav.classList.contains('collapsed') && !nav.contains(event.target) && event.target !== navBtn) {
        nav.classList.add('collapsed');
    }

    const dropdown = document.getElementById('custom-book-selector');
    const body = document.getElementById('dropdown-body');
    if (dropdown && body && !dropdown.contains(event.target)) {
        body.style.display = 'none';
    }
});

function populateBookDropdown() {
    const body = document.getElementById('dropdown-body');
    body.innerHTML = '';
    
    const categories = {};
    window.availableBooks.forEach(book => {
        const cat = book.details.category || 'Uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(book);
    });

    for (const cat in categories) {
        const catDiv = document.createElement('div');
        catDiv.className = 'category-group';
        const catHeader = document.createElement('div');
        catHeader.className = 'category-header';
        catHeader.innerText = cat + ' ▼';
        const bookList = document.createElement('div');
        bookList.className = 'category-book-list';
        bookList.style.display = 'none';

        catHeader.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.category-book-list').forEach(list => { if (list !== bookList) list.style.display = 'none'; });
            bookList.style.display = bookList.style.display === 'none' ? 'block' : 'none';
        };

        categories[cat].forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.innerText = book.details.title;
            bookItem.onclick = (e) => {
                e.stopPropagation();
                document.querySelector('.dropdown-header').innerText = book.details.title;
                document.getElementById('dropdown-body').style.display = 'none';
                window.handleBookChange(book.details.id);
            };
            bookList.appendChild(bookItem);
        });

        catDiv.appendChild(catHeader);
        catDiv.appendChild(bookList);
        body.appendChild(catDiv);
    }
    
    if (window.availableBooks.length > 0) {
        window.currentBookId = window.availableBooks[0].details.id;
        document.querySelector('.dropdown-header').innerText = window.availableBooks[0].details.title;
    }
}

window.toggleDropdown = function() {
    const body = document.getElementById('dropdown-body');
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
};

window.handleBookChange = function(bookId) {
    window.currentBookId = bookId;
    loadBookContent();
};

function loadBookContent() {
    const container = document.getElementById('slides-container');
    const selectedBook = window.availableBooks.find(b => b.details.id === window.currentBookId);
    
    if (container && selectedBook) {
        // Clear container and start building
        container.innerHTML = `
            <div class="slide active" id="landing-slide" data-type="Landing">
                <div class="book-content" style="display:block !important; width:100%;">
                    <h2 style="font-size:3rem; margin-bottom:10px; border:none; text-align:center;">Welcome to VilBooks</h2>
                    <p style="text-align:center; color:#555; margin-bottom:40px;">Select a topic below or click the right margin to begin.</p>
                    <div id="dynamic-toc" class="toc-container"></div>
                </div>
            </div>
        `;

        // Sort modules by sequence to ensure correct order
        const sortedModules = selectedBook.modules.sort((a, b) => a.sequence - b.sequence);
        let unitsWithQuestions = new Set();

        sortedModules.forEach(mod => {
            if (mod.type === "Question") unitsWithQuestions.add(mod.unit);
            
            // Render Slide
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slide';
            slideDiv.setAttribute('data-type', mod.type);
            slideDiv.setAttribute('data-unit', mod.unit);
            slideDiv.setAttribute('data-maintopic', mod.maintopic);
            if (mod.subtopic) slideDiv.setAttribute('data-subtopic', mod.subtopic);
            
            if (mod.type === "Question") {
                slideDiv.setAttribute('data-difficulty', mod.difficulty);
                slideDiv.setAttribute('data-question-id', mod.questionId);
                slideDiv.setAttribute('data-answer', mod.answer);
                slideDiv.setAttribute('data-points', mod.points);
                slideDiv.id = `slide-${mod.questionId}`;
            }

            slideDiv.innerHTML = mod.html;
            container.appendChild(slideDiv);
        });

        // Generate Review Hub Slides for each unit that has questions
        unitsWithQuestions.forEach(unit => {
            const hubDiv = document.createElement('div');
            hubDiv.className = 'slide';
            hubDiv.setAttribute('data-type', 'ReviewHub');
            hubDiv.setAttribute('data-unit', unit);
            hubDiv.setAttribute('data-maintopic', 'Review Questions');
            hubDiv.setAttribute('data-subtopic', 'Review Questions');
            hubDiv.innerHTML = `
                <div class="book-content" style="display:block !important; width:100%;">
                    <h2>${unit}: Review Questions</h2>
                    <p>Select a question set below to test your knowledge. You can reset individual sets to try again.</p>
                    <div class="review-hub-container" id="hub-${unit.replace(/\s+/g, '')}"></div>
                </div>
            `;
            // Insert the hub slide after the last theory slide of that unit
            const unitSlides = Array.from(container.querySelectorAll(`.slide[data-unit="${unit}"]`));
            const lastTheorySlide = unitSlides.reverse().find(s => s.getAttribute('data-type') === 'Theory');
            if (lastTheorySlide) {
                lastTheorySlide.insertAdjacentElement('afterend', hubDiv);
            } else {
                container.appendChild(hubDiv);
            }
        });

        const isTeacher = window.currentUser && window.currentUser.role === 'teacher';
        const hasSubscribed = isTeacher || window.userSubscriptions.some(sub => sub.bookId === window.currentBookId && sub.expiry > Date.now());

        const subBtn = document.getElementById('subscribe-btn');
        if (!hasSubscribed && subBtn) {
            subBtn.style.display = 'block';
            subBtn.innerText = `Rent Book (₱${selectedBook.details.rent.toFixed(2)} / 6mo)`;
        } else if (subBtn) {
            subBtn.style.display = 'none';
        }
    }
    
    initEnvironment();
    generateTOC();
    showSlide(0); // Jump to landing page
}

function updateReviewHubs() {
    const hubs = document.querySelectorAll('.slide[data-type="ReviewHub"]');
    hubs.forEach(hub => {
        const unit = hub.getAttribute('data-unit');
        const container = hub.querySelector('.review-hub-container');
        if (!container) return;
        
        container.innerHTML = '';
        const difficulties = ['Easy', 'Average', 'Difficult'];
        const isSubscribed = window.currentUser && window.currentUser.role === 'teacher' || window.userSubscriptions.some(sub => sub.bookId === window.currentBookId && sub.expiry > Date.now());

        difficulties.forEach(diff => {
            const qSlides = Array.from(document.querySelectorAll(`.slide[data-type="Question"][data-unit="${unit}"][data-difficulty="${diff}"]`));
            if(qSlides.length === 0) return;

            let answered = 0;
            let total = qSlides.length;
            let score = 0;
            let maxScore = 0;

            qSlides.forEach(s => {
                const qId = s.getAttribute('data-question-id');
                const pts = parseInt(s.getAttribute('data-points')) || 0;
                maxScore += pts;
                if(window.studentAnswers[qId]) {
                    answered++;
                    const ansData = window.studentAnswers[qId];
                    const userAns = typeof ansData === 'object' ? ansData.val : ansData;
                    const isExp = typeof ansData === 'object' ? ansData.expired : false;
                    if(String(userAns).toLowerCase() === String(s.getAttribute('data-answer')).toLowerCase() && !isExp) {
                        score += pts;
                    }
                }
            });

            const isLocked = !isSubscribed && diff !== 'Easy';
            let statusText = isLocked ? "🔒 Locked (Requires Rent)" : (answered === 0 ? "Not Started" : (answered === total ? "Completed" : "In Progress"));
            let scoreText = answered === total ? `Score: ${score} / ${maxScore}` : "";
            
            const firstSlideIndex = window.slides.findIndex(s => s === qSlides[0]);

            const row = document.createElement('div');
            row.className = 'hub-row';
            row.innerHTML = `
                <div class="hub-info">
                    <strong>${diff} Set</strong>
                    <span class="hub-status">${statusText}</span>
                    <span class="hub-score">${scoreText}</span>
                </div>
            `;

            const btnContainer = document.createElement('div');
            
            if (!isLocked) {
                const startBtn = document.createElement('button');
                startBtn.className = 'start-btn';
                startBtn.style.padding = '8px 15px';
                startBtn.style.fontSize = '0.9rem';
                startBtn.innerText = answered === total ? 'Review' : (answered > 0 ? 'Continue' : 'Start');
                startBtn.onclick = () => showSlide(firstSlideIndex);
                btnContainer.appendChild(startBtn);
            }

            if (answered > 0) {
                const resetBtn = document.createElement('button');
                resetBtn.className = 'reset-btn';
                resetBtn.style.marginLeft = '10px';
                resetBtn.innerText = 'Reset';
                resetBtn.onclick = () => resetSetLogic(unit, diff);
                btnContainer.appendChild(resetBtn);
            }

            row.appendChild(btnContainer);
            container.appendChild(row);
        });
    });
}

function generateTOC() {
    const tocContainer = document.getElementById('dynamic-toc');
    if (!tocContainer) return;

    let tocHTML = '<ul class="toc-main-list">';
    let currentMain = null;
    let currentSub = null;
    let hasCurrentMain = false;

    window.slides.forEach((slide, index) => {
        if (slide.id === 'landing-slide' || slide.getAttribute('data-type') === 'Question') return; // Hide individual questions from TOC
        
        let unit = slide.getAttribute('data-unit');
        let mainTopic = slide.getAttribute('data-maintopic');
        let subTopic = slide.getAttribute('data-subtopic');

        if (mainTopic && mainTopic !== currentMain) {
            if (hasCurrentMain) tocHTML += '</ul></li>'; 
            tocHTML += `<li class="toc-main-item"><strong>${unit}: ${mainTopic}</strong><ul class="toc-sub-list">`;
            currentMain = mainTopic;
            currentSub = null;
            hasCurrentMain = true;
        }
        
        if (subTopic && subTopic !== currentSub) {
            tocHTML += `<li class="toc-sub-item"><a href="#" onclick="event.preventDefault(); showSlide(${index})">${subTopic}</a></li>`;
            currentSub = subTopic;
        }
    });

    if (hasCurrentMain) tocHTML += '</ul></li>';
    tocHTML += '</ul>';
    tocContainer.innerHTML = tocHTML;
}

window.showSubscriptionModal = function() {
    const selectedBook = window.availableBooks.find(b => b.details.id === window.currentBookId);
    document.getElementById('sub-book-title').innerText = selectedBook.details.title;
    document.getElementById('sub-book-price').innerText = `₱${selectedBook.details.rent.toFixed(2)}`;
    
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('subscription-modal').style.display = 'flex';
};

window.processSubscription = async function() {
    const btn = document.querySelector('#subscription-modal .start-btn');
    btn.innerText = "Processing...";
    
    setTimeout(async () => {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        
        window.userSubscriptions = window.userSubscriptions.filter(sub => 
            (typeof sub === 'string' ? sub : sub.bookId) !== window.currentBookId
        );
        
        window.userSubscriptions.push({
            bookId: window.currentBookId,
            expiry: expiryDate.getTime()
        });
        
        if (window.currentUser && db) {
            const u = window.currentUser;
            const docId = `${u.CN || '00'}-${u.Idnumber}-${u.LastName} ${u.FirstName}`;
            const docRef = doc(db, 'students', docId);
            try {
                await setDoc(docRef, { subscriptions: window.userSubscriptions }, { merge: true });
            } catch(e) { console.error("Error saving subscription:", e); }
        }

        btn.innerText = "Confirm Payment";
        document.getElementById('subscription-modal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        
        alert("Rental successful! You have full access for 6 months.");
        loadBookContent();
    }, 1500);
};

window.startUnitTrial = async function() {
    const trialKey = `${window.currentBookId}_${window.pendingTrialUnit}`;
    window.unitTrials[trialKey] = Date.now();
    
    if (window.currentUser && db) {
        const u = window.currentUser;
        const docId = `${u.CN || '00'}-${u.Idnumber}-${u.LastName} ${u.FirstName}`;
        const docRef = doc(db, 'students', docId);
        try {
            await setDoc(docRef, { unitTrials: window.unitTrials }, { merge: true });
        } catch(e) { console.error("Error saving trial:", e); }
    }
    
    document.getElementById('trial-modal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    showSlide(window.pendingTrialIndex);
};

window.handleLogin = async function() {
    const id = document.getElementById('auth-id').value;
    const pass = document.getElementById('auth-pass').value;
    const btn = document.querySelector('.login-box .start-btn');
    btn.innerText = "Authenticating...";
    
    try {
        const user = await loginUser(id, pass);
        if (user) {
            window.currentUser = user;
            if(user.section) window.section = user.section;
            if(user.subscriptions) window.userSubscriptions = user.subscriptions;
            if(user.unitTrials) window.unitTrials = user.unitTrials;
            
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('container').style.display = 'flex';
            
            if(user.role === 'student') {
                const cName = `results_${window.activityName}_${window.section}`;
                const docId = `${user.CN || '00'}-${user.Idnumber}-${user.LastName} ${user.FirstName}`;
                const docRef = doc(db, cName, docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    window.studentAnswers = docSnap.data().answers || {};
                }
                loadBookContent();
            } else {
                document.body.classList.add('role-teacher');
                loadBookContent();
                loadTeacherRoster();
            }
        } else {
            document.getElementById('login-error').style.display = 'block';
            btn.innerText = "Login to Library";
        }
    } catch(e) {
        console.error(e);
        btn.innerText = "Login to Library";
    }
};

function initEnvironment() {
    const slideArray = Array.from(document.querySelectorAll('.slide'));
    slideArray.forEach((s, idx) => { s.dataset.globalIndex = idx; });
    window.slides = slideArray; 
    
    window.slides.forEach(slide => {
        const qId = slide.getAttribute('data-question-id');
        if (!qId) return;

        const storedAnsData = window.studentAnswers[qId];
        
        if (storedAnsData && window.currentUser && window.currentUser.role === 'student') {
            let userAns = typeof storedAnsData === 'object' ? storedAnsData.val : storedAnsData;
            let isExp = typeof storedAnsData === 'object' ? storedAnsData.expired : false;
            
            slide.setAttribute('data-locked', 'true');
            const inputEl = document.getElementById(`input-${qId}`);
            if(inputEl) {
                inputEl.value = userAns;
                inputEl.disabled = true;
            }
            
            if(slide.getAttribute('data-type') === 'Question') {
                slide.querySelectorAll('.mcq-option').forEach(el => {
                    el.style.pointerEvents = 'none';
                    let optText = el.innerText.trim();
                    optText = optText.replace(/^([A-D])\)\s*/i, '');
                    if(optText === userAns || el.innerText.startsWith(userAns + ')')) el.classList.add('selected');
                });
            }
            
            const subBtn = document.getElementById(`submit-${qId}`);
            const expBtn = document.getElementById(`exp-${qId}`);
            if (subBtn) subBtn.style.display = 'none';
            if (expBtn) expBtn.style.display = 'inline-block';
            
            const fb = document.getElementById(`feedback-${qId}`);
            if(fb) {
                fb.style.display = 'block';
                const correctVal = slide.getAttribute('data-answer');
                const points = parseInt(slide.getAttribute('data-points'));
                
                if(String(userAns).toLowerCase() === String(correctVal).toLowerCase()) {
                    fb.className = 'quiz-feedback feedback-correct';
                    if(isExp) fb.innerText = `Correct! However, time expired (0 pts awarded).`;
                    else fb.innerText = `Correct! Well done. (+${points} pts)`;
                } else {
                    fb.className = 'quiz-feedback feedback-wrong';
                    if(isExp) fb.innerText = `Time Expired & Incorrect Answer Saved. (Expected: ${correctVal})`;
                    else fb.innerText = `Incorrect Answer Saved. (Expected: ${correctVal})`;
                }
            }
        }
    });

    updateReviewHubs();
}

window.resetSetLogic = async function(unit, difficulty) {
    if(!confirm(`Warning: Resetting the ${difficulty} set for ${unit} will erase your answers for these specific questions. Proceed?`)) return;
    
    window.slides.forEach(s => {
        if(s.getAttribute('data-unit') === unit && s.getAttribute('data-difficulty') === difficulty && s.getAttribute('data-type') === 'Question') {
            const qId = s.getAttribute('data-question-id');
            if (qId) {
                delete window.studentAnswers[qId];
                
                s.removeAttribute('data-locked');
                s.removeAttribute('data-timer-expired');
                const inputEl = document.getElementById(`input-${qId}`);
                if(inputEl) { inputEl.value = ''; inputEl.disabled = false; inputEl.style.backgroundColor = ''; inputEl.style.cursor = 'text'; }
                s.querySelectorAll('.mcq-option').forEach(el => { el.classList.remove('selected'); el.style.pointerEvents = 'auto'; });
                
                const subBtn = document.getElementById(`submit-${qId}`);
                const expBtn = document.getElementById(`exp-${qId}`);
                const fb = document.getElementById(`feedback-${qId}`);
                if(subBtn) subBtn.style.display = 'inline-block';
                if(expBtn) expBtn.style.display = 'none';
                if(fb) fb.style.display = 'none';
            }
        }
    });
    
    await saveToFirebase();
    updateReviewHubs(); 
    
    // Jump back to the Review Hub slide for this unit
    const hubIndex = window.slides.findIndex(s => s.getAttribute('data-type') === 'ReviewHub' && s.getAttribute('data-unit') === unit);
    if(hubIndex !== -1) showSlide(hubIndex);
};

function updateSetScoreDisplay(setName) {
    let sScore = 0;
    let sMax = 0;
    window.slides.forEach(s => {
        if(s.getAttribute('data-unit') === setName && s.getAttribute('data-type') === 'Question') {
            const qId = s.getAttribute('data-question-id');
            const pts = parseInt(s.getAttribute('data-points')) || 0;
            sMax += pts;
            
            const ansData = window.studentAnswers[qId];
            if(ansData) {
                let userAns = typeof ansData === 'object' ? ansData.val : ansData;
                let isExp = typeof ansData === 'object' ? ansData.expired : false;
                if(String(userAns).toLowerCase() === String(s.getAttribute('data-answer')).toLowerCase() && !isExp) {
                    sScore += pts;
                }
            }
        }
    });
    document.getElementById('user-score').innerText = `${sScore} / ${sMax}`;
    return { sScore, sMax };
}

window.returnToLanding = function() {
    document.getElementById('celebration-modal').style.display = 'none';
    showSlide(0);
};

window.showSlide = function(targetIndex) {
    const targetSlide = window.slides[targetIndex];
    if(!targetSlide) return;

    const unit = targetSlide.getAttribute('data-unit');
    const type = targetSlide.getAttribute('data-type');
    const isTeacher = window.currentUser && window.currentUser.role === 'teacher';
    const hasSubscribed = isTeacher || window.userSubscriptions.some(sub => sub.bookId === window.currentBookId && sub.expiry > Date.now());

    // --- 1-HOUR TRIAL & SUBSCRIPTION CHECK ---
    if (unit && unit !== 'Unit 1' && !hasSubscribed && targetSlide.id !== 'landing-slide') {
        const trialKey = `${window.currentBookId}_${unit}`;
        const trialStart = window.unitTrials[trialKey];

        if (!trialStart) {
            window.pendingTrialUnit = unit;
            window.pendingTrialIndex = targetIndex;
            document.getElementById('trial-unit-name').innerText = unit;
            document.getElementById('overlay').style.display = 'flex';
            document.getElementById('trial-modal').style.display = 'flex';
            return; // Stop transition
        } else if (Date.now() > trialStart + (60 * 60 * 1000)) { // 1 Hour limit
            showSubscriptionModal();
            return; // Stop transition
        }
    }

    clearInterval(window.timerInterval);
    clearTimeout(window.narrationTimeout);
    
    // Toggle HUD visibility: Only show when actually on a Question slide
    const topHud = document.getElementById('top-hud');
    if (type === 'Question') {
        topHud.style.display = 'flex';
    } else {
        topHud.style.display = 'none';
    }

    const direction = targetIndex > window.currentSlideIndex ? 'next' : (targetIndex < window.currentSlideIndex ? 'prev' : 'none');
    const oldSlide = window.slides[window.currentSlideIndex];

    window.slides.forEach(s => {
        s.classList.remove('active', 'flip-next-out', 'flip-next-in', 'flip-prev-out', 'flip-prev-in');
    });

    if (direction === 'next' && oldSlide && oldSlide !== targetSlide) {
        oldSlide.classList.add('flip-next-out');
        targetSlide.classList.add('flip-next-in');
    } else if (direction === 'prev' && oldSlide && oldSlide !== targetSlide) {
        oldSlide.classList.add('flip-prev-out');
        targetSlide.classList.add('flip-prev-in');
    }

    window.currentSlideIndex = targetIndex;
    targetSlide.classList.add('active');
    targetSlide.scrollTop = 0;
    
    // Move trackers to current slide
    if (targetSlide.id !== 'landing-slide' && type === 'Question') {
        const tracker = document.getElementById('question-tracker');
        targetSlide.appendChild(tracker);
    }

    updateSetScoreDisplay(unit);

    if (!isTeacher && !targetSlide.hasAttribute('data-locked') && type === 'Question') {
        if(targetIndex > 0) setTimeout(() => playNarration(targetSlide), 1500);
        else playNarration(targetSlide);
    } else {
        window.speechSynthesis.cancel();
    }
    
    updateReviewHubs(); // Ensure hub is fresh if we visit it
};

window.nextSlide = function() {
    if (window.currentSlideIndex < window.slides.length - 1) {
        window.showSlide(window.currentSlideIndex + 1);
    }
};

window.prevSlide = function() {
    if (window.currentSlideIndex > 0) {
        window.showSlide(window.currentSlideIndex - 1);
    }
};

window.selectOption = function(qId, val) {
    const slide = document.getElementById(`slide-${qId}`);
    if(!slide || slide.hasAttribute('data-locked')) return;

    slide.querySelectorAll('.mcq-option').forEach(el => el.classList.remove('selected'));
    const inputEl = document.getElementById(`input-${qId}`);
    if(inputEl) inputEl.value = val;
    event.currentTarget.classList.add('selected');
};

window.submitAnswer = function(qId) {
    const slide = document.getElementById(`slide-${qId}`);
    const inputEl = document.getElementById(`input-${qId}`);
    if(!inputEl) return;

    const userVal = inputEl.value.trim();
    if(userVal === "") {
        alert("Please enter or select an answer before submitting.");
        return;
    }

    window.speechSynthesis.cancel();
    clearTimeout(window.narrationTimeout);
    clearInterval(window.timerInterval);
    
    const isExpired = slide.hasAttribute('data-timer-expired');
    const correctVal = slide.getAttribute('data-answer');
    const points = parseInt(slide.getAttribute('data-points'));
    const isCorrect = String(userVal).toLowerCase() === String(correctVal).toLowerCase();

    slide.setAttribute('data-locked', 'true');
    inputEl.disabled = true;
    inputEl.style.backgroundColor = '#f3f4f6';
    inputEl.style.cursor = 'not-allowed';
    slide.querySelectorAll('.mcq-option').forEach(el => el.style.pointerEvents = 'none');
    
    const subBtn = document.getElementById(`submit-${qId}`);
    const expBtn = document.getElementById(`exp-${qId}`);
    if(subBtn) subBtn.style.display = 'none';
    if(expBtn) expBtn.style.display = 'inline-block';

    const fb = document.getElementById(`feedback-${qId}`);
    if(fb) {
        fb.style.display = 'block';
        if (isCorrect) {
            fb.className = 'quiz-feedback feedback-correct';
            fb.innerText = isExpired ? `Correct! However, time expired (0 pts awarded).` : `Correct! Well done. (+${points} pts)`;
        } else {
            fb.className = 'quiz-feedback feedback-wrong';
            fb.innerText = isExpired ? `Time Expired & Incorrect. (Expected: ${correctVal})` : `Incorrect. (Expected: ${correctVal})`;
        }
    }

    window.studentAnswers[qId] = { val: userVal, expired: isExpired };
    
    const currentUnit = slide.getAttribute('data-unit');
    updateSetScoreDisplay(currentUnit);
    saveToFirebase();

    let diffComplete = true;
    const currentDiff = slide.getAttribute('data-difficulty');
    window.slides.forEach(s => {
        if(s.getAttribute('data-unit') === currentUnit && s.getAttribute('data-difficulty') === currentDiff && s.getAttribute('data-type') === 'Question') {
            const sqId = s.getAttribute('data-question-id');
            if(sqId && !window.studentAnswers[sqId]) diffComplete = false;
        }
    });

    if (diffComplete && window.currentUser.role !== 'teacher') {
        setTimeout(() => { document.getElementById('celebration-modal').style.display = 'flex'; }, 1000);
    } else {
         setTimeout(() => {
             if(window.currentSlideIndex < window.slides.length - 1) window.nextSlide();
         }, 3000);
    }
};

async function saveToFirebase() {
    if (!db || window.currentUser.role === 'teacher') return;
    
    const cName = `results_${window.activityName}_${window.section}`;
    const u = window.currentUser;
    const docId = `${u.CN || '00'}-${u.Idnumber}-${u.LastName} ${u.FirstName}`;

    let qMap = {};
    window.slides.forEach(s => {
        if(s.getAttribute('data-type') === 'Question') {
            qMap[s.getAttribute('data-question-id')] = {
                type: s.getAttribute('data-type'),
                topic: s.getAttribute('data-topic'),
                questionText: s.getAttribute('data-text')
            };
        }
    });

    const payload = {
        status: "in_progress",
        answers: window.studentAnswers,
        questionsTaken: qMap,
        metadata: {
            timestamp: new Date().toISOString(),
            studentId: u.Idnumber,
            studentName: `${u.FirstName} ${u.LastName}`,
            CN: u.CN || "00",
            section: window.section
        }
    };

    try {
        await setDoc(doc(db, cName, docId), payload, { merge: true });
        await setDoc(doc(db, 'results_list', `${window.activityName}_${window.section}`), {
            activityName: window.activityName, section: window.section, lastUpdate: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Save Error:", e);
    }
}

async function loadTeacherRoster() {
    if (!db) return;
    const cName = `results_${window.activityName}_${window.section}`;
    const rosterQuery = query(collection(db, cName), orderBy('metadata.studentName'));
    const rosterDiv = document.getElementById('roster-list');
    
    try {
        const snap = await getDocs(rosterQuery);
        if (snap.empty) { rosterDiv.innerHTML = "<p style='color:#8b949e; padding:10px;'>No student submissions found.</p>"; return; }
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'roster-item';
            div.innerText = data.metadata.studentName;
            div.onclick = () => previewStudent(data, div);
            rosterDiv.appendChild(div);
        });
    } catch(e) { console.error(e); }
    initEnvironment();
}

function previewStudent(data, rowDiv) {
    document.querySelectorAll('.roster-item').forEach(el => el.classList.remove('active'));
    rowDiv.classList.add('active');
    
    window.studentAnswers = data.answers || {};
    
    window.slides.forEach(slide => {
        if(slide.getAttribute('data-type') !== 'Question') return;

        const qId = slide.getAttribute('data-question-id');
        const inputEl = document.getElementById(`input-${qId}`);
        const correctVal = slide.getAttribute('data-answer');
        const storedAnsData = window.studentAnswers[qId];

        if (storedAnsData !== undefined) {
            let userAns = typeof storedAnsData === 'object' ? storedAnsData.val : storedAnsData;
            let isExp = typeof storedAnsData === 'object' ? storedAnsData.expired : false;
            
            if(inputEl) {
                inputEl.value = userAns;
                inputEl.disabled = true;
            }
            slide.setAttribute('data-locked', 'true');
            
            if(slide.getAttribute('data-type') === 'Question') {
                slide.querySelectorAll('.mcq-option').forEach(el => {
                    el.style.pointerEvents = 'none';
                    let optText = el.innerText.trim();
                    optText = optText.replace(/^([A-D])\)\s*/i, '');
                    if(optText === userAns || el.innerText.startsWith(userAns + ')')) el.classList.add('selected');
                });
            }
            
            const subBtn = document.getElementById(`submit-${qId}`);
            const expBtn = document.getElementById(`exp-${qId}`);
            if(subBtn) subBtn.style.display = 'none';
            if(expBtn) expBtn.style.display = 'inline-block';
            
            const fb = document.getElementById(`feedback-${qId}`);
            if(fb) {
                fb.style.display = 'block';
                if(String(userAns).toLowerCase() === String(correctVal).toLowerCase()) {
                    fb.className = 'quiz-feedback feedback-correct';
                    if (isExp) fb.innerText = `Student answered correctly, but time expired (0 pts).`;
                    else fb.innerText = `Student answered correctly: ${userAns}`;
                } else {
                    fb.className = 'quiz-feedback feedback-wrong';
                    if (isExp) fb.innerText = `Student answered: ${userAns} (Time Expired / Expected: ${correctVal})`;
                    else fb.innerText = `Student answered: ${userAns} (Expected: ${correctVal})`;
                }
            }
        } else {
            slide.removeAttribute('data-locked');
            if(inputEl) inputEl.value = '';
            slide.querySelectorAll('.mcq-option').forEach(el => el.classList.remove('selected'));
            
            const subBtn = document.getElementById(`submit-${qId}`);
            const expBtn = document.getElementById(`exp-${qId}`);
            const fb = document.getElementById(`feedback-${qId}`);
            if(subBtn) subBtn.style.display = 'inline-block';
            if(expBtn) expBtn.style.display = 'none';
            if(fb) fb.style.display = 'none';
        }
    });
    showSlide(0);
}
