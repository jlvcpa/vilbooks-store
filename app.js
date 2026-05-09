// app.js
import { collection, query, getDocs, orderBy, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { db, loginUser } from './auth.js';

// Import Books
import { bookDetails as fabm01Details, bookContent as fabm01Content } from './FABM01/fabm01.js';

window.availableBooks = [
    { details: fabm01Details, content: fabm01Content }
];

window.currentUser = null;
window.currentSlideIndex = 0;
window.slides = []; 
window.orderedSets = [];
window.setSlides = {}; 
window.timerInterval = null;
window.narrationTimeout = null; 
window.activityName = "VilBooks Practice";
window.section = "Default"; 
window.studentAnswers = {}; 
window.celebratedSets = new Set(); 
window.targetSetToStart = null;
window.userSubscriptions = []; // Now holds objects: { bookId: "FABM01", expiry: timestamp }

document.addEventListener('DOMContentLoaded', () => {
    populateBookDropdown();
});

// Hide dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const nav = document.getElementById('slide-navigator');
    const navBtn = document.getElementById('nav-toggle-btn');
    if (!nav.classList.contains('collapsed') && !nav.contains(event.target) && event.target !== navBtn) {
        nav.classList.add('collapsed');
    }

    const dropdown = document.getElementById('custom-book-selector');
    const body = document.getElementById('dropdown-body');
    if (dropdown && body && !dropdown.contains(event.target)) {
        body.style.display = 'none';
    }
});

// New Custom Category Accordion Dropdown
function populateBookDropdown() {
    const body = document.getElementById('dropdown-body');
    body.innerHTML = '';
    
    // Group books by category
    const categories = {};
    window.availableBooks.forEach(book => {
        const cat = book.details.category || 'Uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(book);
    });

    // Build DOM
    for (const cat in categories) {
        const catDiv = document.createElement('div');
        catDiv.className = 'category-group';
        
        const catHeader = document.createElement('div');
        catHeader.className = 'category-header';
        catHeader.innerText = cat + ' ▼';
        
        const bookList = document.createElement('div');
        bookList.className = 'category-book-list';
        bookList.style.display = 'none';

        // Accordion Logic: Click category to show books, hide others
        catHeader.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.category-book-list').forEach(list => {
                if (list !== bookList) list.style.display = 'none';
            });
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
    
    // Set initial book on load
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
    showDashboard();
};

function loadBookContent() {
    const container = document.getElementById('slides-container');
    const selectedBook = window.availableBooks.find(b => b.details.id === window.currentBookId);
    
    const isTeacher = window.currentUser && window.currentUser.role === 'teacher';
    
    // Check if user has an active, non-expired rental
    const hasSubscribed = isTeacher || window.userSubscriptions.some(sub => {
        // Fallback for older data that might just be string IDs
        if (typeof sub === 'string') return sub === window.currentBookId; 
        return sub.bookId === window.currentBookId && sub.expiry > Date.now();
    });

    if (container && selectedBook) {
        container.innerHTML = selectedBook.content;

        if (!hasSubscribed) {
            const slides = container.querySelectorAll('.slide');
            slides.forEach(slide => {
                const difficulty = slide.getAttribute('data-difficulty');
                if (difficulty && difficulty !== 'Easy') {
                    slide.remove(); 
                }
            });
            
            const subBtn = document.getElementById('subscribe-btn');
            if(subBtn) {
                subBtn.style.display = 'block';
                subBtn.innerText = `Rent Book (₱${selectedBook.details.rent.toFixed(2)} / 6mo)`;
            }
        } else {
            const subBtn = document.getElementById('subscribe-btn');
            if(subBtn) subBtn.style.display = 'none';
        }
    }
    
    initEnvironment();
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
        // Calculate 6 months expiry
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        
        // Remove old subscription record for this book to prevent duplicates
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
        const overlay = document.getElementById('overlay');
        if(overlay) overlay.style.display = 'none';
        
        alert("Rental successful! You have full access for 6 months.");
        loadBookContent();
        showDashboard();
    }, 1500);
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
            
            document.getElementById('login-overlay').style.display = 'none';
            
            if(user.role === 'student') {
                const cName = `results_${window.activityName}_${window.section}`;
                const docId = `${user.CN || '00'}-${user.Idnumber}-${user.LastName} ${user.FirstName}`;
                const docRef = doc(db, cName, docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    window.studentAnswers = docSnap.data().answers || {};
                }
                loadBookContent();
                showDashboard();
            } else {
                document.getElementById('container').style.display = 'flex';
                document.body.classList.add('role-teacher');
                loadBookContent();
                loadTeacherRoster();
            }
        } else {
            document.getElementById('login-error').style.display = 'block';
            btn.innerText = "Login to Module";
        }
    } catch(e) {
        console.error(e);
        btn.innerText = "Login to Module";
    }
};

function initEnvironment() {
    const diffWeight = { "Easy": 1, "Average": 2, "Difficult": 3 };
    const container = document.getElementById('slides-container');
    const slideArray = Array.from(document.querySelectorAll('.slide'));
    
    slideArray.sort((a, b) => {
        const setA = a.getAttribute('data-unit') || '';
        const setB = b.getAttribute('data-unit') || '';
        if (setA !== setB) return setA.localeCompare(setB);

        const typeA = a.getAttribute('data-type') || '';
        const typeB = b.getAttribute('data-type') || '';
        if (typeA !== typeB) return typeA === 'Theory' ? -1 : 1;

        const diffA = a.getAttribute('data-difficulty') || '';
        const diffB = b.getAttribute('data-difficulty') || '';
        if (diffWeight[diffA] !== diffWeight[diffB]) return (diffWeight[diffA] || 0) - (diffWeight[diffB] || 0);

        return 0; 
    });
    
    slideArray.forEach(slide => container.appendChild(slide)); 
    window.slides = document.querySelectorAll('.slide'); 

    window.orderedSets = [];
    window.setSlides = {};
    window.slides.forEach((s, idx) => {
        s.dataset.globalIndex = idx;
        let sSet = s.getAttribute('data-unit') || 'Uncategorized';
        if(!window.orderedSets.includes(sSet)) window.orderedSets.push(sSet);
        if(!window.setSlides[sSet]) window.setSlides[sSet] = [];
        window.setSlides[sSet].push(s);
    });

    buildNavigator();
    
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
}

function getSetStatus(setName) {
    let answeredCount = 0;
    let requiredCount = 0;
    
    if (!window.setSlides[setName]) return { state: 'locked', text: 'Locked', class: 'status-locked' };

    window.setSlides[setName].forEach(s => {
        if(s.getAttribute('data-type') === 'Question') {
            requiredCount++;
            let qId = s.getAttribute('data-question-id');
            if(window.studentAnswers[qId]) answeredCount++;
        }
    });

    if(requiredCount === 0) return { state: 'unlocked', text: 'Theory Only', class: 'status-unlocked' };
    if(answeredCount === requiredCount) return { state: 'completed', text: 'Completed', class: 'status-completed' };
    if(answeredCount > 0) return { state: 'in_progress', text: 'In Progress', class: 'status-progress' };
    
    let setIndex = window.orderedSets.indexOf(setName);
    if(setIndex === 0) return { state: 'unlocked', text: 'Unlocked', class: 'status-unlocked' };

    let prevSet = window.orderedSets[setIndex - 1];
    let prevAnswered = 0;
    let prevTotal = 0;
    
    window.setSlides[prevSet].forEach(s => {
        if(s.getAttribute('data-type') === 'Question') {
            prevTotal++;
            if(window.studentAnswers[s.getAttribute('data-question-id')]) prevAnswered++;
        }
    });
    
    if(prevAnswered === prevTotal || prevTotal === 0) return { state: 'unlocked', text: 'Unlocked', class: 'status-unlocked' };
    return { state: 'locked', text: 'Locked', class: 'status-locked' };
}

function updateNavVisibility() {
    const currentSlide = window.slides[window.currentSlideIndex];
    if (!currentSlide) return;
    
    const isTeacher = window.currentUser && window.currentUser.role === 'teacher';
    const navControls = document.getElementById('nav-controls');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    
    if (navControls) navControls.style.display = 'flex';
    
    let prevDisabled = window.currentSlideIndex === 0;
    let nextDisabled = window.currentSlideIndex === window.slides.length - 1;
    
    if (!isTeacher && currentSlide.getAttribute('data-type') === 'Question') {
        const qId = currentSlide.getAttribute('data-question-id');
        if (!window.studentAnswers[qId]) {
            nextDisabled = true;
        }
    }
    
    if (prevBtn) prevBtn.disabled = prevDisabled;
    if (nextBtn) nextBtn.disabled = nextDisabled;
}

window.showDashboard = function() {
    document.getElementById('container').style.display = 'none';
    window.speechSynthesis.cancel();
    clearTimeout(window.narrationTimeout);
    clearInterval(window.timerInterval);
    
    const dashOverlay = document.getElementById('dashboard-overlay');
    const setContainer = document.getElementById('dashboard-sets');
    setContainer.innerHTML = '';

    window.orderedSets.forEach((setName, idx) => {
        const status = getSetStatus(setName);
        
        const row = document.createElement('div');
        row.className = 'dashboard-set-row';
        
        const nameEl = document.createElement('div');
        nameEl.className = 'set-name';
        nameEl.innerText = setName;
        
        const statusEl = document.createElement('div');
        statusEl.className = `set-status ${status.class}`;
        statusEl.innerText = status.text;
        
        const actionDiv = document.createElement('div');
        
        if(status.state !== 'locked') {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'start-btn';
            actionBtn.style.padding = "8px 15px";
            actionBtn.style.fontSize = "0.9rem";
            actionBtn.style.width = "auto";
            actionBtn.style.marginTop = "0";
            actionBtn.style.marginRight = "10px";
            actionBtn.innerText = status.state === 'completed' ? 'Review' : (status.state === 'in_progress' ? 'Continue' : 'Start');
            actionBtn.onclick = () => showHeadsUp(setName);
            actionDiv.appendChild(actionBtn);
        }

        if(status.state === 'completed' || status.state === 'in_progress') {
            const resetBtn = document.createElement('button');
            resetBtn.className = 'reset-btn';
            resetBtn.innerText = 'Reset';
            resetBtn.onclick = () => resetSetLogic(setName);
            actionDiv.appendChild(resetBtn);
        }
        
        row.appendChild(nameEl);
        row.appendChild(statusEl);
        row.appendChild(actionDiv);
        setContainer.appendChild(row);
    });

    dashOverlay.style.display = 'flex';
};

window.showHeadsUp = function(setName) {
    document.getElementById('dashboard-overlay').style.display = 'none';
    document.getElementById('headsup-title').innerText = `Prepare for ${setName}`;
    window.targetSetToStart = setName;
    document.getElementById('headsup-overlay').style.display = 'flex';
};

window.executeStartSet = function() {
    document.getElementById('headsup-overlay').style.display = 'none';
    document.getElementById('container').style.display = 'flex';
    document.getElementById('dashboard-toggle-btn').style.display = 'block';
    
    document.body.classList.remove('book-mode');
    
    let targetIndex = 0;
    let found = false;
    
    for(let i=0; i<window.slides.length; i++) {
        const s = window.slides[i];
        if(s.getAttribute('data-unit') === window.targetSetToStart) {
            if(!found) { targetIndex = i; found = true; }
            const qId = s.getAttribute('data-question-id');
            if(s.getAttribute('data-type') === 'Question' && !window.studentAnswers[qId]) {
                targetIndex = i;
                break;
            }
        }
    }
    showSlide(targetIndex);
};

window.resetSetLogic = async function(setName) {
    if(!confirm(`Warning: Resetting ${setName} will erase answers for this unit AND all units after it. Proceed?`)) return;
    
    const setIndex = window.orderedSets.indexOf(setName);
    for(let i = setIndex; i < window.orderedSets.length; i++) {
        const sName = window.orderedSets[i];
        window.setSlides[sName].forEach(s => {
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
        });
        window.celebratedSets.delete(sName);
    }
    
    await saveToFirebase();
    buildNavigator(); 
    showDashboard();
};

function buildNavigator() {
    const navList = document.getElementById('nav-list');
    navList.innerHTML = '';
    let currentSet = null;
    let currentDiff = null;
    let currentSetUl = null;
    let currentDiffUl = null;
    let qCounters = {}; 

    window.slides.forEach((slide, index) => {
        const sSet = slide.getAttribute('data-unit') || 'Uncategorized';
        const sDiff = slide.getAttribute('data-difficulty') || 'General';
        const topic = slide.getAttribute('data-topic') || 'General';
        
        const setKey = sSet.replace(/\s+/g, '-');
        const diffKey = setKey + '-' + sDiff.replace(/\s+/g, '-');

        if (sSet !== currentSet) {
            currentSet = sSet;
            currentDiff = null; 

            let setLi = document.createElement('li');
            setLi.className = 'nav-grandparent';
            setLi.setAttribute('data-unit', setKey);
            
            const stat = getSetStatus(sSet);
            if(stat.state === 'locked' && window.currentUser && window.currentUser.role === 'student') {
                setLi.classList.add('locked');
                setLi.innerHTML = `<span>🔒 ${sSet}</span>`;
                setLi.onclick = (e) => { e.stopPropagation(); alert(`Finish answering previous units to unlock ${sSet}.`); };
                
                navList.appendChild(setLi); 
                currentSetUl = null; 
            } else {
                setLi.innerHTML = `<span>${sSet}</span> <span>▼</span>`;
                
                const mySetUl = document.createElement('ul');
                mySetUl.className = 'nav-week-children';
                mySetUl.setAttribute('data-set-ul', setKey);
                mySetUl.style.display = 'none'; 
                currentSetUl = mySetUl; 
                
                setLi.onclick = (e) => {
                    e.stopPropagation();
                    const isOpening = mySetUl.style.display !== 'block';
                    document.querySelectorAll('.nav-week-children').forEach(ul => ul.style.display = 'none');
                    if (isOpening) mySetUl.style.display = 'block';
                };
                
                navList.appendChild(setLi);    
                navList.appendChild(mySetUl);  
            }
        }

        if (sDiff !== currentDiff && currentSetUl) {
            currentDiff = sDiff;
            
            let diffLi = document.createElement('li');
            diffLi.className = 'nav-parent';
            diffLi.setAttribute('data-diff', diffKey);
            diffLi.innerHTML = `<span>${sDiff}</span> <span>▼</span>`;
            
            const myDiffUl = document.createElement('ul');
            myDiffUl.className = 'nav-day-children';
            myDiffUl.setAttribute('data-diff-ul', diffKey);
            myDiffUl.style.display = 'none';
            currentDiffUl = myDiffUl;
            
            const parentSetUl = currentSetUl; 

            diffLi.onclick = (e) => {
                e.stopPropagation();
                const isOpening = myDiffUl.style.display !== 'block';
                parentSetUl.querySelectorAll('.nav-day-children').forEach(ul => ul.style.display = 'none');
                if (isOpening) myDiffUl.style.display = 'block';
            };
            
            currentSetUl.appendChild(diffLi);    
            currentSetUl.appendChild(myDiffUl);  
            
            qCounters[diffKey] = 1;
        }

        if(currentDiffUl) {
            const qLi = document.createElement('li');
            qLi.className = 'nav-child-item nav-slide-link';
            qLi.dataset.index = index;
            
            const qNumStr = String(qCounters[diffKey]).padStart(2, '0');
            qLi.innerHTML = `<span>${qNumStr}. ${topic}</span>`;
            
            qLi.onclick = (e) => { 
                e.stopPropagation();
                showSlide(index); 
            };
            currentDiffUl.appendChild(qLi);
            qCounters[diffKey]++;
        }
    });
}

function updateTracker(index) {
    const tracker = document.getElementById('question-tracker');
    tracker.innerHTML = '';
    const currentSlide = window.slides[index];
    if (!currentSlide) return;
    
    const currentSet = currentSlide.getAttribute('data-unit');
    const currentDiff = currentSlide.getAttribute('data-difficulty');

    window.slides.forEach((s, idx) => {
        if (s.getAttribute('data-unit') === currentSet && s.getAttribute('data-difficulty') === currentDiff) {
            const circle = document.createElement('div');
            circle.className = 'tracker-circle';
            circle.id = `tracker-${idx}`;
            
            const qId = s.getAttribute('data-question-id');
            if (qId && window.studentAnswers[qId]) circle.classList.add('answered');
            if (idx === index) circle.classList.add('active');
            
            tracker.appendChild(circle);
        }
    });
}

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

window.toggleNavigator = function(event) {
    if (event) event.stopPropagation();
    const nav = document.getElementById('slide-navigator');
    nav.classList.toggle('collapsed');
};

window.toggleBookMode = function() {
    const currentSlide = window.slides[window.currentSlideIndex];
    const qId = currentSlide.getAttribute('data-question-id');
    const isTeacher = window.currentUser && window.currentUser.role === 'teacher';
    const isAnswered = qId ? !!window.studentAnswers[qId] : true; 

    if (!isTeacher && !isAnswered && currentSlide.getAttribute('data-type') === 'Question') return;

    document.body.classList.toggle('book-mode');
    updateNavVisibility(); 
};

window.triggerCelebration = function(setName) {
    const { sScore, sMax } = updateSetScoreDisplay(setName);
    document.getElementById('celebration-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('celeb-box').classList.add('show'), 50);
    
    document.getElementById('celeb-msg').innerText = `Thank you for finishing ${setName}. You got ${sScore} out of ${sMax} possible points!`;
    
    const celebBtn = document.querySelector('#celeb-box .start-btn');
    
    const setIndex = window.orderedSets.indexOf(setName);
    const nextSet = window.orderedSets[setIndex + 1];
    
    if (nextSet) {
        celebBtn.innerText = `Proceed to ${nextSet}`;
        celebBtn.onclick = () => {
            document.getElementById('celebration-modal').style.display = 'none';
            document.getElementById('celeb-box').classList.remove('show');
            showHeadsUp(nextSet);
        };
    } else {
        celebBtn.innerText = "Return to Dashboard";
        celebBtn.onclick = () => {
            document.getElementById('celebration-modal').style.display = 'none';
            document.getElementById('celeb-box').classList.remove('show');
            showDashboard();
        };
    }
};

function playNarration(slide) {
    window.speechSynthesis.cancel();
    clearTimeout(window.narrationTimeout);
    
    if(slide.getAttribute('data-type') === 'Theory') return;

    const diff = slide.getAttribute('data-difficulty');
    const topic = slide.getAttribute('data-topic');
    
    let qNum = 1;
    const currentSet = slide.getAttribute('data-unit');
    for(let i = 0; i < window.currentSlideIndex; i++) {
        if(window.slides[i].getAttribute('data-unit') === currentSet && window.slides[i].getAttribute('data-difficulty') === diff && window.slides[i].getAttribute('data-type') === 'Question') {
            qNum++;
        }
    }
    
    let introText = "";
    if (diff) introText += `${diff} Round, Question ${qNum}. `;
    if (topic) introText += `Topic: ${topic}. `;
    
    let bodyText = "";
    const qTextEl = slide.querySelector('.question-text');
    if (qTextEl) bodyText += `${qTextEl.innerText} `;
    
    const options = slide.querySelectorAll('.mcq-option');
    if(options.length > 0) {
        options.forEach(opt => {
            let text = opt.innerText.trim();
            text = text.replace(/^([A-D])\)\s*/i, '$1, ');
            bodyText += `${text}, `;
        });
    }
    
    const firstReading = introText + bodyText;
    const secondReading = "I repeat. " + bodyText + "Timer Starts Now!";

    if ('speechSynthesis' in window) {
        const utterance1 = new SpeechSynthesisUtterance(firstReading);
        utterance1.rate = 0.85; 
        
        utterance1.onend = () => {
            window.narrationTimeout = setTimeout(() => {
                if (window.slides[window.currentSlideIndex] !== slide) return;

                const utterance2 = new SpeechSynthesisUtterance(secondReading);
                utterance2.rate = 0.85;
                
                utterance2.onend = () => {
                    if(window.currentUser && window.currentUser.role !== 'teacher' && !slide.hasAttribute('data-locked')) {
                        startTimer(slide);
                    }
                };
                window.speechSynthesis.speak(utterance2);
            }, 3000);
        };
        
        window.speechSynthesis.speak(utterance1);
    } else {
        window.narrationTimeout = setTimeout(() => { startTimer(slide); }, 3000);
    }
}

function startTimer(slide) {
    clearInterval(window.timerInterval);
    if(slide.getAttribute('data-type') === 'Theory') return;

    const timerUI = document.getElementById('timer-display');
    timerUI.style.display = 'block';
    
    let duration = 30; // Default
    const diff = slide.getAttribute('data-difficulty');

    if (diff === 'Easy') duration = 30;
    else if (diff === 'Average') duration = 45;
    else if (diff === 'Difficult') duration = 60;

    let timeLeft = duration;
    timerUI.innerText = formatTime(timeLeft);

    window.timerInterval = setInterval(() => {
        timeLeft--;
        timerUI.innerText = formatTime(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(window.timerInterval);
            const qId = slide.getAttribute('data-question-id');
            if(qId) {
                slide.setAttribute('data-timer-expired', 'true');
                const fb = document.getElementById(`feedback-${qId}`);
                if(fb) {
                    fb.className = 'quiz-feedback feedback-wrong';
                    fb.innerText = 'Time Expired! Please submit an answer to proceed (0 points will be awarded).';
                    fb.style.display = 'block';
                }
            }
        }
    }, 1000);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

window.showSlide = function(targetIndex) {
    if (window.currentUser && window.currentUser.role === 'student') {
        let firstUnanswered = window.slides.length;
        for (let i = 0; i < window.slides.length; i++) {
            if (window.slides[i].getAttribute('data-type') === 'Question') {
                const qId = window.slides[i].getAttribute('data-question-id');
                if (qId && !window.studentAnswers[qId]) {
                    firstUnanswered = i;
                    break;
                }
            }
        }
        
        if (targetIndex > firstUnanswered) {
            const currentUnansweredSlide = window.slides[firstUnanswered];
            const currentUnansweredSet = currentUnansweredSlide.getAttribute('data-unit');
            const targetSet = window.slides[targetIndex].getAttribute('data-unit');
            
            if (targetSet !== currentUnansweredSet) {
                alert(`Please finish answering all questions in ${currentUnansweredSet} first.`);
            } else {
                alert("Questions need to be answered strictly in the order of presentation. Please answer and submit the current question first.");
            }
            return; 
        }
    }

    clearInterval(window.timerInterval);
    clearTimeout(window.narrationTimeout);
    document.getElementById('timer-display').style.display = 'none';

    const direction = targetIndex > window.currentSlideIndex ? 'next' : (targetIndex < window.currentSlideIndex ? 'prev' : 'none');
    const oldSlide = window.slides[window.currentSlideIndex];
    const currentSlide = window.slides[targetIndex];

    const currentQId = currentSlide.getAttribute('data-question-id');
    const isTeacher = window.currentUser && window.currentUser.role === 'teacher';
    const isAnswered = currentQId ? !!window.studentAnswers[currentQId] : true;
    if (!isTeacher && !isAnswered && currentSlide.getAttribute('data-type') === 'Question') {
        document.body.classList.remove('book-mode');
    }

    window.slides.forEach(s => {
        s.classList.remove('active', 'flip-next-out', 'flip-next-in', 'flip-prev-out', 'flip-prev-in');
    });

    if (direction === 'next' && oldSlide && oldSlide !== currentSlide) {
        oldSlide.classList.add('flip-next-out');
        currentSlide.classList.add('flip-next-in');
    } else if (direction === 'prev' && oldSlide && oldSlide !== currentSlide) {
        oldSlide.classList.add('flip-prev-out');
        currentSlide.classList.add('flip-prev-in');
    }

    window.currentSlideIndex = targetIndex;
    currentSlide.classList.add('active');
    
    currentSlide.scrollTop = 0;
    
    const tracker = document.getElementById('question-tracker');
    const navControls = document.getElementById('nav-controls');
    currentSlide.appendChild(tracker);
    currentSlide.appendChild(navControls);

    updateTracker(targetIndex);
    updateSetScoreDisplay(currentSlide.getAttribute('data-unit'));

    const navItems = document.querySelectorAll('.nav-slide-link');
    navItems.forEach((item) => {
        if (parseInt(item.dataset.index) === window.currentSlideIndex) {
            item.classList.add('active-nav');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            const diffUl = item.closest('.nav-day-children');
            const setUl = item.closest('.nav-week-children');
            
            if (setUl) {
                document.querySelectorAll('.nav-week-children').forEach(ul => ul.style.display = 'none');
                setUl.style.display = 'block';
            }
            if (diffUl) {
                setUl.querySelectorAll('.nav-day-children').forEach(ul => ul.style.display = 'none');
                diffUl.style.display = 'block';
            }
        } else {
            item.classList.remove('active-nav');
        }
    });

    updateNavVisibility();

    if (window.currentUser && window.currentUser.role !== 'teacher' && !currentSlide.hasAttribute('data-locked') && currentSlide.getAttribute('data-type') === 'Question') {
        if(targetIndex > 0) {
            setTimeout(() => playNarration(currentSlide), 3000);
        } else {
            playNarration(currentSlide);
        }
    } else {
        window.speechSynthesis.cancel();
    }
};

window.nextSlide = function() {
    const currentSlide = window.slides[window.currentSlideIndex];
    const currentSet = currentSlide.getAttribute('data-unit');
    const nextSlideNode = window.slides[window.currentSlideIndex + 1];

    if (nextSlideNode) {
        const nextSet = nextSlideNode.getAttribute('data-unit');
        
        if (currentSet !== nextSet) {
            const status = getSetStatus(currentSet);
            if (status.state === 'completed') {
                window.triggerCelebration(currentSet);
                return; 
            }
        }
        window.showSlide(window.currentSlideIndex + 1);
    } else {
        const status = getSetStatus(currentSet);
        if (status.state === 'completed') {
            window.triggerCelebration(currentSet);
        }
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

    slide.querySelectorAll('.mcq-option').forEach(el => {
        el.classList.remove('selected');
    });
    
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
            if (isExpired) fb.innerText = `Correct! However, time expired (0 pts awarded).`;
            else fb.innerText = `Correct! Well done. (+${points} pts)`;
        } else {
            fb.className = 'quiz-feedback feedback-wrong';
            if (isExpired) fb.innerText = `Time Expired & Incorrect. (Expected: ${correctVal})`;
            else fb.innerText = `Incorrect. (Expected: ${correctVal})`;
        }
    }

    window.studentAnswers[qId] = { val: userVal, expired: isExpired };
    
    updateTracker(window.currentSlideIndex);
    const currentSet = slide.getAttribute('data-unit');
    updateSetScoreDisplay(currentSet);
    
    saveToFirebase();
    updateNavVisibility(); 

    let allAnswered = true;
    window.slides.forEach(s => {
        if(s.getAttribute('data-unit') === currentSet && s.getAttribute('data-type') === 'Question') {
            const sqId = s.getAttribute('data-question-id');
            if(sqId && !window.studentAnswers[sqId]) allAnswered = false;
        }
    });

    if (allAnswered && !window.celebratedSets.has(currentSet) && window.currentUser && window.currentUser.role !== 'teacher') {
        window.celebratedSets.add(currentSet);
        setTimeout(() => {
            window.triggerCelebration(currentSet);
        }, 1000);
    } else {
         setTimeout(() => {
             if(window.currentSlideIndex < window.slides.length - 1) {
                 window.nextSlide();
             }
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

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    if (e.target.closest('#slides-container')) {
        touchStartX = e.changedTouches[0].screenX;
    }
}, { passive: true });

document.addEventListener('touchend', e => {
    if (e.target.closest('#slides-container')) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    }
}, { passive: true });

function handleSwipeGesture() {
    const swipeThreshold = 50; 

    if (touchStartX - touchEndX > swipeThreshold) {
        const nextBtn = document.getElementById('btn-next');
        if (nextBtn && !nextBtn.disabled) {
            window.nextSlide();
        }
    }
    
    if (touchEndX - touchStartX > swipeThreshold) {
        const prevBtn = document.getElementById('btn-prev');
        if (prevBtn && !prevBtn.disabled) {
            window.prevSlide();
        }
    }
}
