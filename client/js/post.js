document.addEventListener('DOMContentLoaded', function() {
    updateHeader();
    loadPost();
    loadComments();
    if (isLoggedIn()) {
        loadLikeStatus();
    }
});

function updateHeader() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    if (isLoggedIn()) {
        const user = getCurrentUser();
        authButtons.innerHTML = `
            <a href="profile.html" class="btn-user">Привет, ${user.username}</a>
            <a href="#" class="btn-outline" id="logout-btn">Выйти</a>
        `;
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

function getPostId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadPost() {
    const postId = getPostId();
    if (!postId) {
        document.querySelector('.post-container').innerHTML = '<p>Пост не найден</p>';
        return;
    }

    try {
        const post = await apiRequest('/posts/' + postId);

        document.querySelector('.post-title').textContent = post.title;
        document.querySelector('.post-category').textContent = post.category;
        document.querySelector('.post-category').href = 'index.html?category=' + post.category;
        document.querySelector('.post-author-name').textContent = post.author_name;
        document.querySelector('.post-content').innerHTML = post.content;

        const date = new Date(post.published_at || post.created_at);
        document.querySelector('.post-date').textContent = date.toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        if (post.featured_image) {
            document.querySelector('.post-cover').src = post.featured_image;
            document.querySelector('.post-cover').style.display = 'block';
        }

        const tagsContainer = document.querySelector('.post-tags');
        if (post.tags && post.tags.length > 0) {
            tagsContainer.innerHTML = post.tags.map(tag =>
                `<a href="search.html?tag=${tag}" class="post-tag">${tag}</a>`
            ).join('');
        }

        document.querySelector('.post-author-box-name').textContent = post.author_name;
        document.querySelector('.post-author-box p').textContent = post.author_bio || '';

        document.querySelector('.breadcrumbs').innerHTML = `
            <a href="index.html">Главная</a>
            <span>→</span>
            <a href="index.html?category=${post.category}">${post.category}</a>
            <span>→</span>
            <span>${post.title}</span>
        `;

    } catch (error) {
        console.log('Ошибка загрузки поста:', error);
    }
}

async function loadComments() {
    const postId = getPostId();
    if (!postId) return;

    try {
        const comments = await apiRequest('/comments/' + postId);
        const commentsList = document.querySelector('.comments-list');
        const commentsTitle = document.querySelector('.comments-title');

        const currentUser = getCurrentUser();

        commentsTitle.textContent = 'Комментарии (' + comments.length + ')';

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">Пока нет комментариев. Будьте первым!</p>';
            return;
        }

        commentsList.innerHTML = '';

        comments.forEach(comment => {
            const date = new Date(comment.created_at);
            const isOwner = currentUser && currentUser.id === comment.author_id;
            
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            commentEl.id = 'comment-' + comment.id;
            commentEl.innerHTML = `
                <img src="${comment.author_avatar || 'https://via.placeholder.com/40x40'}" alt="Аватар" class="comment-avatar">
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author_name}</span>
                        <span class="comment-date">${date.toLocaleDateString('ru-RU')}</span>
                        ${comment.updated_at && comment.updated_at !== comment.created_at ? '<span class="comment-edited">(изменено)</span>' : ''}
                    </div>
                    <p class="comment-text">${comment.content}</p>
                    ${isOwner ? `
                    <div class="comment-actions">
                        <button class="btn-comment-edit" onclick="editComment(${comment.id})">✏️</button>
                        <button class="btn-comment-delete" onclick="deleteComment(${comment.id})">🗑</button>
                    </div>
                    ` : ''}
                </div>
            `;
            commentsList.appendChild(commentEl);
        });

    } catch (error) {
        console.log('Ошибка загрузки комментариев:', error);
    }
}

async function loadLikeStatus() {
    const postId = getPostId();
    if (!postId) return;

    try {
        const data = await apiRequest('/posts/' + postId + '/like');
        const likeBtn = document.getElementById('btn-like');
        const likeCount = document.getElementById('like-count');

        if (likeBtn) {
            likeBtn.textContent = data.liked ? '❤️' : '🤍';
        }
        if (likeCount) {
            likeCount.textContent = data.count;
        }
    } catch (error) {
        console.log('Ошибка лайка:', error);
    }
}

document.getElementById('comment-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isLoggedIn()) {
        alert('Войдите чтобы оставить комментарий');
        window.location.href = 'login.html';
        return;
    }

    const postId = getPostId();
    const content = document.querySelector('.comment-input').value;

    if (!content.trim()) return;

    try {
        await apiRequest('/comments/' + postId, {
            method: 'POST',
            body: JSON.stringify({ content: content })
        });

        document.querySelector('.comment-input').value = '';
        loadComments();
    } catch (error) {
        alert('Ошибка при отправке комментария');
    }
});

document.getElementById('btn-like').addEventListener('click', async function() {
    if (!isLoggedIn()) {
        alert('Войдите чтобы поставить лайк');
        return;
    }

    const postId = getPostId();
    if (!postId) return;

    try {
        await apiRequest('/posts/' + postId + '/like', {
            method: 'POST'
        });
        loadLikeStatus();
    } catch (error) {
        console.log('Ошибка:', error);
    }
});

async function editComment(commentId) {
    const commentEl = document.getElementById('comment-' + commentId);
    const textEl = commentEl.querySelector('.comment-text');
    const oldText = textEl.textContent;

    textEl.innerHTML = `
        <input type="text" class="comment-edit-input" value="${oldText}">
        <button class="btn-save-small" onclick="saveComment(${commentId})">Сохранить</button>
        <button class="btn-cancel-small" onclick="cancelEdit(${commentId}, '${oldText.replace(/'/g, "\\'")}')">Отмена</button>
    `;
}

async function saveComment(commentId) {
    const commentEl = document.getElementById('comment-' + commentId);
    const input = commentEl.querySelector('.comment-edit-input');
    const newText = input.value.trim();

    if (!newText) return;

    try {
        await apiRequest('/comments/' + commentId, {
            method: 'PUT',
            body: JSON.stringify({ content: newText })
        });
        loadComments();
        showMessage('Комментарий обновлён');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function cancelEdit(commentId, oldText) {
    const commentEl = document.getElementById('comment-' + commentId);
    commentEl.querySelector('.comment-text').textContent = oldText;
}

async function deleteComment(commentId) {
    if (!confirm('Удалить комментарий?')) return;

    try {
        await apiRequest('/comments/' + commentId, {
            method: 'DELETE'
        });
        loadComments();
        showMessage('Комментарий удалён');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}