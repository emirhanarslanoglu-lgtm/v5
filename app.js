import defaultDeck from './data.js';

let activeDeck = [];
let currentCategory = 'tümü';
let filteredCards = [];
let currentIndex = 0;

// Durum Yönetimi (LocalStorage)
let favorites = JSON.parse(localStorage.getItem('b2_german_favorites')) || [];
let learned = JSON.parse(localStorage.getItem('b2_german_learned')) || [];
let review = JSON.parse(localStorage.getItem('b2_german_review')) || [];
let stats = JSON.parse(localStorage.getItem('b2_german_stats')) || { flipped: 0, timeSpentSec: 0 };

// DOM Elements
const cardContainer = document.getElementById('card-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentIndexEl = document.getElementById('current-index');
const totalCountEl = document.getElementById('total-count');
const categoryBtns = document.querySelectorAll('.category-btn');
const themeBtns = document.querySelectorAll('.theme-btn');

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarNavBtns = document.querySelectorAll('.sidebar-nav .menu-btn');

// Stat Elements
const statFlipped = document.getElementById('stat-flipped');
const statFavorites = document.getElementById('stat-favorites');
const statLearned = document.getElementById('stat-learned');
const statReview = document.getElementById('stat-review');
const statTime = document.getElementById('stat-time');

// Modal Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const resetBtn = document.getElementById('reset-btn');
const deckSizeEl = document.getElementById('deck-size');

// Guide Modal Elements
const guideBtn = document.getElementById('guide-btn');
const guideModal = document.getElementById('guide-modal');
const closeGuideBtn = document.getElementById('close-guide-btn');
const guideOkBtn = document.getElementById('guide-ok-btn');

// Quiz Elements
const quizModal = document.getElementById('quiz-modal');
const closeQuizBtn = document.getElementById('close-quiz-btn');
const quizMenu = document.getElementById('quiz-menu');
const quizPlayArea = document.getElementById('quiz-play-area');
const quizResultsArea = document.getElementById('quiz-results-area');
const quizCardWrapper = document.getElementById('quiz-card-wrapper');
const quizNextBtn = document.getElementById('quiz-next-action-btn');
const quizFinishEarlyBtn = document.getElementById('quiz-finish-early-btn');
const quizStartBtns = document.querySelectorAll('.quiz-start-btn');
const quizIdxEl = document.getElementById('quiz-idx');
const quizTotalEl = document.getElementById('quiz-total-count');

// Quiz State
let isQuizActive = false;
let quizMode = 0; // 1: all, 2: review, 3: turkish
let quizCards = [];
let currentQuizIdx = 0;
let quizResults = []; // { id, isCorrect, input }

// Initialize
function init() {
    initTheme();
    loadActiveDeck();
    setupCategoryListeners();
    setupControls();
    setupSwipe();
    setupModalListeners();
    setupSidebar();
    setupQuizListeners();
    filterCards('tümü');
    updateStatsUI();
    
    // Time tracking
    setInterval(() => {
        stats.timeSpentSec += 1;
        if (stats.timeSpentSec % 5 === 0) saveStats(); // Her 5 sn de bir kaydet
        updateTimeUI();
    }, 1000);
}

function initTheme() {
    const savedTheme = localStorage.getItem('b2_german_theme') || 'pastel-blue';
    applyTheme(savedTheme);
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(btn.getAttribute('data-theme'));
        });
    });
}

function applyTheme(theme) {
    localStorage.setItem('b2_german_theme', theme);
    document.body.className = ''; 
    themeBtns.forEach(btn => {
        btn.getAttribute('data-theme') === theme ? btn.classList.add('active') : btn.classList.remove('active');
    });
    document.body.classList.add(`theme-${theme}`);
}

function loadActiveDeck() {
    const savedDeck = localStorage.getItem('b2_german_custom_deck');
    if (savedDeck) {
        try { activeDeck = JSON.parse(savedDeck); }
        catch(e) { activeDeck = [...defaultDeck]; }
    } else {
        activeDeck = [...defaultDeck];
    }
    if(deckSizeEl) deckSizeEl.textContent = activeDeck.length;
}

// ----- STATS & TRACKING -----
function saveStats() {
    localStorage.setItem('b2_german_stats', JSON.stringify(stats));
}

function updateStatsUI() {
    if(!statFlipped) return;
    statFlipped.textContent = stats.flipped;
    statFavorites.textContent = favorites.length;
    statLearned.textContent = learned.length;
    statReview.textContent = review.length;
    updateTimeUI();
}

function updateTimeUI() {
    if(!statTime) return;
    const h = Math.floor(stats.timeSpentSec / 3600);
    const m = Math.floor((stats.timeSpentSec % 3600) / 60);
    const s = stats.timeSpentSec % 60;
    
    if (h > 0) statTime.textContent = `${h}s ${m}d`;
    else if (m > 0) statTime.textContent = `${m}d ${s}sn`;
    else statTime.textContent = `${s}sn`;
}

// ----- SIDEBAR -----
function setupSidebar() {
    if(!sidebarToggleBtn) return;
    sidebarToggleBtn.addEventListener('click', () => setSidebar(true));
    closeSidebarBtn.addEventListener('click', () => setSidebar(false));
    sidebarOverlay.addEventListener('click', () => setSidebar(false));

    sidebarNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            
            // Eğer kategori butonları varsa active'i sil
            categoryBtns.forEach(b => b.classList.remove('active'));
            sidebarNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (view === 'learned') {
                filterCards('learned');
                setSidebar(false);
            } else if (view === 'review') {
                filterCards('review');
                setSidebar(false);
            } else if (view === 'quiz') {
                openQuizModal();
                setSidebar(false);
            }
        });
    });
}

function setSidebar(show) {
    if (show) {
        updateStatsUI();
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    } else {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
}

// ----- CARD RENDERING -----
function filterCards(category) {
    currentCategory = category;
    
    if (category === 'tümü') {
        filteredCards = [...activeDeck];
    } else if (category === 'favoriler') {
        filteredCards = activeDeck.filter(card => favorites.includes(card.id));
    } else if (category === 'learned') {
        filteredCards = activeDeck.filter(card => learned.includes(card.id));
    } else if (category === 'review') {
        filteredCards = activeDeck.filter(card => review.includes(card.id));
    } else {
        filteredCards = activeDeck.filter(card => card.category === category);
    }
    
    currentIndex = 0;
    filteredCards.length > 0 ? renderCard(filteredCards[currentIndex]) : renderCard(null);
}

function setupCategoryListeners() {
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            if(sidebarNavBtns) sidebarNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterCards(btn.getAttribute('data-category'));
        });
    });
}

function renderCard(cardData, animationClass = '') {
    cardContainer.innerHTML = '';
    if (!cardData) {
        cardContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h2>Kelime bulunamadı.</h2>
            </div>
        `;
        updateProgress();
        updateControls();
        return;
    }

    const isFavorite = favorites.includes(cardData.id);
    const isLearned = learned.includes(cardData.id);
    const isReview = review.includes(cardData.id);

    // Learning Status Buttons HTML
    const learningControlsHTML = `
        <div class="learning-status-controls">
            <button class="status-btn learned-btn ${isLearned ? 'active' : ''}" data-id="${cardData.id}" title="Öğrendim"><i class="fas fa-check"></i></button>
            <button class="status-btn review-btn ${isReview ? 'active' : ''}" data-id="${cardData.id}" title="Tekrar Edilecek"><i class="fas fa-times"></i></button>
        </div>
    `;

    const cardHTML = `
        <div class="flashcard ${animationClass}" data-cat="${cardData.category}" id="current-card">
            <!-- Ön Yüz (Almanca) -->
            <div class="card-face front">
                <div class="category-label">${capitalize(cardData.category)}</div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${cardData.id}" title="Favorilere Ekle">
                    <i class="fas fa-heart"></i>
                </button>
                <div class="pronunciation">${cardData.pronunciation || ''}</div>
                <div class="word">${cardData.germanWord}</div>
                <div class="sentence">${cardData.germanSentence || ''}</div>
                ${learningControlsHTML}
            </div>
            
            <!-- Arka Yüz (Türkçe) -->
            <div class="card-face back">
                <div class="category-label">${capitalize(cardData.category)}</div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${cardData.id}" title="Favorilere Ekle">
                    <i class="fas fa-heart"></i>
                </button>
                <div class="translation-word">${cardData.turkishWord}</div>
                <div class="translation-sentence">${cardData.turkishSentence || ''}</div>
                ${learningControlsHTML}
            </div>
        </div>
    `;

    cardContainer.insertAdjacentHTML('beforeend', cardHTML);
    const cardEl = document.getElementById('current-card');

    if(animationClass) {
        setTimeout(() => { if(cardEl) { cardEl.classList.remove(animationClass); cardEl.style.animation = 'none'; } }, 400); 
    }

    // Flip Event
    cardEl.addEventListener('click', (e) => {
        if (e.target.closest('.favorite-btn') || e.target.closest('.status-btn')) return;
        cardEl.classList.toggle('flipped');
        
        // Sadece ilk defa çevrildiğinde sayalım
        if (!cardEl.dataset.countedFlag && !cardEl.classList.contains('slide-in-right') ) {
            stats.flipped++;
            saveStats();
            cardEl.dataset.countedFlag = "true";
        }
    });

    // Favorite Event
    cardEl.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(cardData.id); });
    });

    // Learning Status Event
    cardEl.querySelectorAll('.learned-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggleStatus(cardData.id, 'learned'); });
    });
    cardEl.querySelectorAll('.review-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggleStatus(cardData.id, 'review'); });
    });

    updateProgress();
    updateControls();
}

function toggleFavorite(id) {
    if (favorites.includes(id)) favorites = favorites.filter(favId => favId !== id);
    else favorites.push(id);
    localStorage.setItem('b2_german_favorites', JSON.stringify(favorites));
    document.querySelectorAll('.favorite-btn').forEach(btn => btn.classList.toggle('active', favorites.includes(id)));
    checkAutoRemove(id, 'favoriler', favorites);
}

function toggleStatus(id, type) {
    if (type === 'learned') {
        if (learned.includes(id)) learned = learned.filter(i => i !== id);
        else { learned.push(id); review = review.filter(i => i !== id); }
    } else if (type === 'review') {
        if (review.includes(id)) review = review.filter(i => i !== id);
        else { review.push(id); learned = learned.filter(i => i !== id); }
    }
    
    localStorage.setItem('b2_german_learned', JSON.stringify(learned));
    localStorage.setItem('b2_german_review', JSON.stringify(review));
    
    // UI Güncelleme (Geçerli Kart İçin)
    const cardEl = document.getElementById('current-card');
    if (cardEl) {
        cardEl.querySelectorAll('.learned-btn').forEach(b => b.classList.toggle('active', learned.includes(id)));
        cardEl.querySelectorAll('.review-btn').forEach(b => b.classList.toggle('active', review.includes(id)));
    }

    if (currentCategory === 'learned') checkAutoRemove(id, 'learned', learned);
    if (currentCategory === 'review') checkAutoRemove(id, 'review', review);
}

function checkAutoRemove(id, matchingCategory, arr) {
    if (currentCategory === matchingCategory && !arr.includes(id)) {
        setTimeout(() => {
            filteredCards = filteredCards.filter(c => c.id !== id);
            if (currentIndex >= filteredCards.length && currentIndex > 0) currentIndex--;
            filteredCards.length > 0 ? renderCard(filteredCards[currentIndex]) : renderCard(null);
            updateStatsUI();
        }, 300);
    } else {
        updateStatsUI();
    }
}

// ----- CONTROLS & NAV -----
function setupControls() {
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
}

function navigate(direction) {
    if (filteredCards.length === 0) return;
    const currentCard = document.getElementById('current-card');
    
    if (direction === 1 && currentIndex < filteredCards.length - 1) {
        if (currentCard) {
            currentCard.classList.add('slide-out-left');
            setTimeout(() => { currentIndex++; renderCard(filteredCards[currentIndex], 'slide-in-right'); }, 300);
        }
    } else if (direction === -1 && currentIndex > 0) {
        if (currentCard) {
            currentCard.classList.add('slide-out-right');
            setTimeout(() => { currentIndex--; renderCard(filteredCards[currentIndex], 'slide-in-left'); }, 300);
        }
    }
}

function updateProgress() {
    currentIndexEl.textContent = filteredCards.length === 0 ? 0 : currentIndex + 1;
    totalCountEl.textContent = filteredCards.length;
}

function updateControls() {
    prevBtn.disabled = currentIndex === 0 || filteredCards.length === 0;
    nextBtn.disabled = currentIndex === filteredCards.length - 1 || filteredCards.length === 0;
}

function setupSwipe() {
    let touchstartX = 0; let touchendX = 0;
    let isMouseDown = false; let mouseStartX = 0;

    cardContainer.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
    cardContainer.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleGesture(); });
    
    cardContainer.addEventListener('mousedown', e => { isMouseDown = true; mouseStartX = e.screenX; });
    cardContainer.addEventListener('mousemove', e => { if (isMouseDown) e.preventDefault(); });
    cardContainer.addEventListener('mouseup', e => {
        if (!isMouseDown) return;
        isMouseDown = false;
        let mouseEndX = e.screenX;
        if (Math.abs(mouseEndX - mouseStartX) < 20) return;
        touchstartX = mouseStartX; touchendX = mouseEndX;
        handleGesture();
    });
    
    cardContainer.addEventListener('mouseleave', () => { isMouseDown = false; });

    function handleGesture() {
        if (filteredCards.length <= 1) return;
        if (touchstartX - touchendX > 50) navigate(1); 
        if (touchendX - touchstartX > 50) navigate(-1); 
    }
}

// ----- MODALS -----
function setupModalListeners() {
    if(settingsBtn && settingsModal && closeModalBtn) {
        settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
        closeModalBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        settingsModal.addEventListener('click', (e) => { if(e.target === settingsModal) settingsModal.classList.remove('active'); });
    }

    if(guideBtn && guideModal && closeGuideBtn && guideOkBtn) {
        guideBtn.addEventListener('click', () => guideModal.classList.add('active'));
        closeGuideBtn.addEventListener('click', () => guideModal.classList.remove('active'));
        guideOkBtn.addEventListener('click', () => guideModal.classList.remove('active'));
        guideModal.addEventListener('click', (e) => { if(e.target === guideModal) guideModal.classList.remove('active'); });
    }

    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeDeck, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "almanca_b2_deck.json");
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            alert("Desteniz JSON olarak indirildi!");
        });
    }

    if(importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if(Array.isArray(importedData) && importedData.length > 0) {
                        activeDeck = importedData;
                        localStorage.setItem('b2_german_custom_deck', JSON.stringify(activeDeck));
                        if(deckSizeEl) deckSizeEl.textContent = activeDeck.length;
                        filterCards('tümü');
                        alert(`${importedData.length} kelime içeri aktarıldı!`);
                        if(settingsModal) settingsModal.classList.remove('active');
                    } else alert("Geçersiz JSON formatı.");
                } catch(error) { alert("Dosya okunamadı!"); }
            };
            reader.readAsText(file);
            importFile.value = '';
        });
    }

    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            if(confirm("Kendi destenizi silip varsayılan desteye dönmek istediğinize emin misiniz?")) {
                localStorage.removeItem('b2_german_custom_deck');
                activeDeck = [...defaultDeck];
                if(deckSizeEl) deckSizeEl.textContent = activeDeck.length;
                filterCards('tümü');
                alert("Varsayılan desteye dönüldü.");
                if(settingsModal) settingsModal.classList.remove('active');
            }
        });
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==========================================
// QUIZ SİSTEMİ
// ==========================================
function openQuizModal() {
    if(!quizModal) return;
    quizModal.classList.add('active');
    quizMenu.style.display = 'block';
    quizPlayArea.style.display = 'none';
    quizResultsArea.style.display = 'none';
}

function setupQuizListeners() {
    if(!closeQuizBtn) return;
    closeQuizBtn.addEventListener('click', () => {
        if (isQuizActive && !confirm("Quiz devam ediyor. Çıkmak istediğinize emin misiniz?")) return;
        quizModal.classList.remove('active');
        isQuizActive = false;
    });

    document.getElementById('quiz-back-to-menu-btn').addEventListener('click', () => {
        openQuizModal();
    });

    quizStartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            quizMode = parseInt(btn.getAttribute('data-mode'));
            startQuiz(quizMode);
        });
    });

    quizNextBtn.addEventListener('click', () => handleQuizNext());
    quizFinishEarlyBtn.addEventListener('click', () => finishQuiz());
}

function startQuiz(mode) {
    let sourcePool = [];
    if (mode === 2) {
        sourcePool = activeDeck.filter(c => review.includes(c.id));
        if (sourcePool.length === 0) {
            alert("Tekrar edilecek kelimeler (kırmızı çarpı) işaretlemediniz!");
            return;
        }
    } else {
        sourcePool = [...activeDeck];
    }

    // Mix cards
    quizCards = sourcePool.sort(() => 0.5 - Math.random());

    if (quizCards.length === 0) return;

    quizMenu.style.display = 'none';
    quizPlayArea.style.display = 'block';
    quizResultsArea.style.display = 'none';
    
    currentQuizIdx = 0;
    quizResults = [];
    isQuizActive = true;
    quizTotalEl.textContent = quizCards.length;

    renderQuizCard();
}

function renderQuizCard() {
    if (currentQuizIdx >= quizCards.length) {
        finishQuiz();
        return;
    }

    quizIdxEl.textContent = currentQuizIdx + 1;
    const currentCard = quizCards[currentQuizIdx];
    quizCardWrapper.innerHTML = '';

    if (quizMode === 1 || quizMode === 2) {
        // Flashcard Modu
        quizNextBtn.innerHTML = 'İleri <i class="fas fa-arrow-right"></i>';
        const cardHTML = `
            <div class="flashcard slide-in-right" style="position:relative; width:100%; height:300px;" id="q-card">
                <div class="card-face front">
                    <div class="category-label">${capitalize(currentCard.category)}</div>
                    <div class="word">${currentCard.germanWord}</div>
                </div>
                <div class="card-face back">
                    <div class="category-label">${capitalize(currentCard.category)}</div>
                    <div class="translation-word">${currentCard.turkishWord}</div>
                    <div style="margin-top:15px; font-size: 0.9rem; color: #718096">Bildiysen İleri de.</div>
                </div>
            </div>
        `;
        quizCardWrapper.insertAdjacentHTML('beforeend', cardHTML);
        const qc = document.getElementById('q-card');
        qc.addEventListener('click', () => qc.classList.toggle('flipped'));
    } 
    else if (quizMode === 3) {
        // Türkçe Yazılı Mod
        quizNextBtn.innerHTML = 'Kontrol Et <i class="fas fa-check"></i>';
        const cardHTML = `
            <div class="card-face front slide-in-right" style="position:relative; width: 100%; height:auto; padding: 40px 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div class="category-label">${capitalize(currentCard.category)}</div>
                <div class="word" style="margin-bottom:10px;">${currentCard.germanWord}</div>
                <div class="sentence" style="font-size:0.9rem; margin-bottom:10px;">${currentCard.germanSentence || ''}</div>
                
                <input type="text" id="quiz-answer-input" placeholder="Türkçesini girin..." autocomplete="off">
            </div>
        `;
        quizCardWrapper.insertAdjacentHTML('beforeend', cardHTML);
        const inputEl = document.getElementById('quiz-answer-input');
        inputEl.focus();
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleQuizNext();
        });
    }
}

function handleQuizNext() {
    if (!isQuizActive) return;

    const currentCard = quizCards[currentQuizIdx];

    if (quizMode === 3) {
        const inputEl = document.getElementById('quiz-answer-input');
        const userAnswer = inputEl.value.trim().toLowerCase();
        
        // Çok basit kelime eşleştirme
        const baseTurkishWords = currentCard.turkishWord.toLowerCase().split(',').map(s => s.trim());
        let correctAnswers = [];
        baseTurkishWords.forEach(w => {
           let splits = w.split('/');
           splits.forEach(sp => correctAnswers.push(sp.trim()));
        });
        
        let isCorrect = false;
        if(userAnswer !== '') {
            isCorrect = correctAnswers.some(ans => userAnswer.includes(ans) || ans.includes(userAnswer));
        }

        quizResults.push({
            card: currentCard,
            userOutput: userAnswer,
            correct: isCorrect
        });
    } else {
        quizResults.push({ card: currentCard, correct: true, userOutput: 'Görüldü' });
    }

    currentQuizIdx++;
    renderQuizCard();
}

function finishQuiz() {
    isQuizActive = false;
    quizPlayArea.style.display = 'none';
    quizResultsArea.style.display = 'block';

    let correctCount = 0;
    let wrongCount = 0;
    const resListEl = document.getElementById('quiz-res-list');
    resListEl.innerHTML = '';

    if (quizResults.length === 0) {
        resListEl.innerHTML = '<p style="text-align:center;color:#a0aec0;">Quiz test edilmeden bitirildi.</p>';
        document.getElementById('quiz-res-correct').textContent = '0';
        document.getElementById('quiz-res-wrong').textContent = '0';
        return;
    }

    quizResults.forEach(res => {
        if (res.correct) correctCount++;
        else wrongCount++;

        const tr = document.createElement('div');
        tr.style.padding = '10px';
        tr.style.borderRadius = '8px';
        
        tr.style.background = res.correct ? 'rgba(72,187,120,0.1)' : 'rgba(245,101,101,0.1)';
        tr.style.border = res.correct ? '1px solid rgba(72,187,120,0.3)' : '1px solid rgba(245,101,101,0.3)';
        
        let correctIconHTML = res.correct ? '<i class="fas fa-check-circle" style="color:#48bb78;"></i>' : '<i class="fas fa-times-circle" style="color:#f56565;"></i>';

        if (quizMode === 3) {
            tr.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-color)">${res.card.germanWord}</strong>
                    <span style="font-size:1.2rem;">${correctIconHTML}</span>
                </div>
                <div style="font-size:0.9rem; margin-top:5px; color:var(--text-color);">
                    Senin Cevabın: <em>${res.userOutput || '(Boş)'}</em><br>
                    Doğru Çeviri: <strong>${res.card.turkishWord}</strong>
                </div>
            `;
        } else {
            tr.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-color)">${res.card.germanWord}</strong>
                    <span style="color:var(--text-color); font-size:0.9rem;">${res.card.turkishWord}</span>
                </div>
            `;
        }
        resListEl.appendChild(tr);
    });

    document.getElementById('quiz-res-correct').textContent = correctCount;
    document.getElementById('quiz-res-wrong').textContent = wrongCount;
}

document.addEventListener('DOMContentLoaded', init);