// DOM Elements
let currentUser = null;
let currentPage = 1;
let currentKeyword = '';
let totalPages = 1;
let editingPostId = null;

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const authModalTitle = document.getElementById('auth-modal-title');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authName = document.getElementById('auth-name');
const authSubmit = document.getElementById('auth-submit');
const authCancel = document.getElementById('auth-cancel');
const authToggleLink = document.getElementById('auth-toggle-link');

// Post Modal Elements
const postModal = document.getElementById('post-modal');
const postModalTitle = document.getElementById('post-modal-title');
const postQuestion = document.getElementById('post-question');
const postAnswer = document.getElementById('post-answer');
const postKeywords = document.getElementById('post-keywords');
const postImage = document.getElementById('post-image');
const postSave = document.getElementById('post-save');
const postCancel = document.getElementById('post-cancel');

// Main content
const mainContent = document.getElementById('main-content');
const authSection = document.getElementById('auth-section');
const quizContainer = document.getElementById('quiz-container');
const paginationDiv = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search');
const createPostBtn = document.getElementById('create-post-btn');

let isLoginMode = true;

// Helper: Show message
function showMessage(text, type = 'success') {
  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.textContent = text;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// Helper: Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem(CONFIG.STORAGE_KEY);
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Helper: API request
async function apiRequest(endpoint, options = {}) {
  const url = `${CONFIG.API_URL}${endpoint}`;
  const headers = options.body instanceof FormData 
    ? { 'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE_KEY)}` }
    : getAuthHeaders();
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Request failed');
  }
  return response.json();
}

// Auth UI
function renderAuthSection() {
  if (currentUser) {
    authSection.innerHTML = `
      <div class="user-info">
        <span class="user-name">👤 ${escapeHtml(currentUser.name)}</span>
        <span>${escapeHtml(currentUser.email)}</span>
        <button id="logout-btn" class="btn-danger">Logout</button>
      </div>
    `;
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    mainContent.classList.remove('hidden');
  } else {
    authSection.innerHTML = `
      <div class="auth-section">
        <button id="show-login" class="btn-primary">Login</button>
        <button id="show-register" class="btn-secondary">Register</button>
      </div>
    `;
    document.getElementById('show-login')?.addEventListener('click', () => showAuthModal(true));
    document.getElementById('show-register')?.addEventListener('click', () => showAuthModal(false));
    mainContent.classList.add('hidden');
  }
}

function showAuthModal(isLogin) {
  isLoginMode = isLogin;
  authModalTitle.textContent = isLogin ? 'Login' : 'Register';
  authName.classList.toggle('hidden', isLogin);
  authToggleLink.textContent = isLogin ? 'Need an account? Register' : 'Already have an account? Login';
  authEmail.value = '';
  authPassword.value = '';
  authName.value = '';
  authModal.classList.add('active');
}

async function handleAuth() {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  
  if (!email || !password) {
    showMessage('Email and password are required', 'error');
    return;
  }
  
  try {
    let data;
    if (isLoginMode) {
      data = await apiRequest(CONFIG.ROUTES.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } else {
      const name = authName.value.trim();
      if (!name) {
        showMessage('Name is required', 'error');
        return;
      }
      data = await apiRequest(CONFIG.ROUTES.REGISTER, {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
    }
    
    localStorage.setItem(CONFIG.STORAGE_KEY, data.token);
    currentUser = data.user;
    authModal.classList.remove('active');
    renderAuthSection();
    loadQuestions();
    showMessage(isLoginMode ? 'Login successful!' : 'Registration successful!');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function logout() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  currentUser = null;
  renderAuthSection();
  currentPage = 1;
  currentKeyword = '';
  searchInput.value = '';
  showMessage('Logged out');
}

// Load questions
async function loadQuestions() {
  try {
    quizContainer.innerHTML = '<div class="loading">Loading questions...</div>';
    
    let url = `${CONFIG.ROUTES.QUESTIONS}?page=${currentPage}&limit=${CONFIG.POSTS_PER_PAGE}`;
    if (currentKeyword) {
      url += `&keyword=${encodeURIComponent(currentKeyword)}`;
    }
    
    const data = await apiRequest(url);
    totalPages = data.totalPages;
    renderQuestions(data.data);
    renderPagination();
  } catch (error) {
    quizContainer.innerHTML = `<div class="loading">Error: ${escapeHtml(error.message)}</div>`;
  }
}

// Render questions
function renderQuestions(questions) {
  if (!questions || questions.length === 0) {
    quizContainer.innerHTML = '<div class="loading">No questions found.</div>';
    return;
  }
  
  quizContainer.innerHTML = `
    <div class="quiz-grid">
      ${questions.map(q => `
        <div class="quiz-card">
          ${q.imageUrl ? `<img src="${q.imageUrl}" alt="Question image" class="quiz-image" />` : ''}
          <div class="quiz-question">${escapeHtml(q.question)}</div>
          <div class="quiz-answer" id="answer-${q.id}">${escapeHtml(q.answer)}</div>
          <div class="quiz-keywords">
            ${q.keywords.map(k => `<span class="keyword-tag">#${escapeHtml(k)}</span>`).join('')}
          </div>
          <div class="quiz-meta">
            <span>📝 by ${escapeHtml(q.userName)}</span>
            <span>❤️ ${q.likeCount} likes</span>
            <button class="like-button" data-id="${q.id}" data-liked="${q.likedByUser}">
              ${q.likedByUser ? '❤️ Liked' : '♡ Like'}
            </button>
          </div>
          ${currentUser && q.userId === currentUser.id ? `
            <div class="quiz-meta">
              <button class="btn-outline edit-post" data-id="${q.id}" data-question="${escapeHtml(q.question)}" data-answer="${escapeHtml(q.answer)}" data-keywords="${q.keywords.join(',')}">Edit</button>
              <button class="btn-danger delete-post" data-id="${q.id}">Delete</button>
            </div>
          ` : ''}
          <button class="btn-outline show-answer" data-id="${q.id}">Show Answer</button>
        </div>
      `).join('')}
    </div>
  `;
  
  // Attach event listeners
  document.querySelectorAll('.like-button').forEach(btn => {
    btn.addEventListener('click', () => handleLike(parseInt(btn.dataset.id), btn.dataset.liked === 'true'));
  });
  document.querySelectorAll('.show-answer').forEach(btn => {
    btn.addEventListener('click', () => toggleAnswer(parseInt(btn.dataset.id)));
  });
  document.querySelectorAll('.edit-post').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(
      parseInt(btn.dataset.id),
      btn.dataset.question,
      btn.dataset.answer,
      btn.dataset.keywords
    ));
  });
  document.querySelectorAll('.delete-post').forEach(btn => {
    btn.addEventListener('click', () => deletePost(parseInt(btn.dataset.id)));
  });
}

function toggleAnswer(id) {
  const answerDiv = document.getElementById(`answer-${id}`);
  answerDiv.classList.toggle('show');
}

async function handleLike(id, wasLiked) {
  try {
    if (wasLiked) {
      await apiRequest(CONFIG.ROUTES.LIKE(id), { method: 'DELETE' });
    } else {
      await apiRequest(CONFIG.ROUTES.LIKE(id), { method: 'POST' });
    }
    loadQuestions();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// Render pagination
function renderPagination() {
  if (totalPages <= 1) {
    paginationDiv.innerHTML = '';
    return;
  }
  
  let html = '';
  html += `<button id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>`;
  html += `<span style="padding: 8px 16px;">Page ${currentPage} of ${totalPages}</span>`;
  html += `<button id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
  paginationDiv.innerHTML = html;
  
  document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadQuestions();
    }
  });
  document.getElementById('next-page')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadQuestions();
    }
  });
}

// Post CRUD
function openCreateModal() {
  editingPostId = null;
  postModalTitle.textContent = 'Create New Question';
  postQuestion.value = '';
  postAnswer.value = '';
  postKeywords.value = '';
  postImage.value = '';
  postModal.classList.add('active');
}

function openEditModal(id, question, answer, keywords) {
  editingPostId = id;
  postModalTitle.textContent = 'Edit Question';
  postQuestion.value = question;
  postAnswer.value = answer;
  postKeywords.value = keywords;
  postImage.value = '';
  postModal.classList.add('active');
}

async function savePost() {
  const question = postQuestion.value.trim();
  const answer = postAnswer.value.trim();
  const keywords = postKeywords.value.trim();
  
  if (!question || !answer) {
    showMessage('Question and answer are required', 'error');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('question', question);
    formData.append('answer', answer);
    if (keywords) formData.append('keywords', keywords);
    if (postImage.files[0]) formData.append('image', postImage.files[0]);
    
    const url = editingPostId 
      ? `${CONFIG.ROUTES.QUESTIONS}/${editingPostId}`
      : CONFIG.ROUTES.QUESTIONS;
    const method = editingPostId ? 'PUT' : 'POST';
    
    const token = localStorage.getItem(CONFIG.STORAGE_KEY);
    const response = await fetch(`${CONFIG.API_URL}${url}`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Save failed');
    }
    
    postModal.classList.remove('active');
    loadQuestions();
    showMessage(editingPostId ? 'Question updated!' : 'Question created!');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this question?')) return;
  
  try {
    await apiRequest(`${CONFIG.ROUTES.QUESTIONS}/${id}`, { method: 'DELETE' });
    loadQuestions();
    showMessage('Question deleted!');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// Search
function searchQuestions() {
  currentKeyword = searchInput.value.trim();
  currentPage = 1;
  loadQuestions();
}

function clearSearch() {
  searchInput.value = '';
  currentKeyword = '';
  currentPage = 1;
  loadQuestions();
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Event listeners
authSubmit.addEventListener('click', handleAuth);
authCancel.addEventListener('click', () => authModal.classList.remove('active'));
authToggleLink.addEventListener('click', () => showAuthModal(!isLoginMode));

postSave.addEventListener('click', savePost);
postCancel.addEventListener('click', () => postModal.classList.remove('active'));

createPostBtn?.addEventListener('click', openCreateModal);
searchBtn?.addEventListener('click', searchQuestions);
clearSearchBtn?.addEventListener('click', clearSearch);

// Initialize
function init() {
  const token = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (token) {
    apiRequest(CONFIG.ROUTES.PROFILE)
      .then(data => {
        currentUser = data.user;
        renderAuthSection();
        loadQuestions();
      })
      .catch(() => {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        renderAuthSection();
      });
  } else {
    renderAuthSection();
  }
}

init();