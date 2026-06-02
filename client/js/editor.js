document.addEventListener('DOMContentLoaded', function() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user.role === 'user') {
        alert('У вас нет прав для создания статей');
        window.location.href = 'profile.html';
        return;
    }

    updateHeader();
    checkEditMode();
});

function updateHeader() {
    const headerInner = document.querySelector('.header-inner');
    if (!headerInner) return;

    const user = getCurrentUser();
    const existingAuth = headerInner.querySelector('.auth-buttons');
    if (!existingAuth) {
        const authDiv = document.createElement('div');
        authDiv.className = 'auth-buttons';
        authDiv.innerHTML = `
            <a href="profile.html" class="btn-user">Привет, ${user.username}</a>
            <a href="#" class="btn-outline" id="logout-btn">Выйти</a>
        `;
        headerInner.appendChild(authDiv);
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

async function checkEditMode() {
    const postId = getPostId();
    if (postId) {
        document.querySelector('.editor-title-page').textContent = 'Редактирование статьи';
        try {
            const post = await apiRequest('/posts/' + postId);
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-category').value = post.category;
            document.getElementById('post-tags').value = post.tags ? post.tags.join(', ') : '';
            document.getElementById('post-image').value = post.featured_image || '';
            document.getElementById('post-excerpt').value = post.excerpt || '';
            document.getElementById('post-content').value = post.content;
            document.getElementById('post-id').value = postId;
        } catch (error) {
            alert('Ошибка загрузки статьи');
        }
    }
}

document.getElementById('editor-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const postId = document.getElementById('post-id').value;
    const title = document.getElementById('post-title').value;
    const category = document.getElementById('post-category').value;
    const tags = document.getElementById('post-tags').value;
    const image = document.getElementById('post-image').value;
    const excerpt = document.getElementById('post-excerpt').value;
    const content = document.getElementById('post-content').value;

    if (!title || !category || !content) {
        alert('Заполните заголовок, категорию и содержание');
        return;
    }

    const body = {
        title,
        category,
        content,
        excerpt: excerpt || content.substring(0, 200),
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        featuredImage: image || ''
    };

    try {
        if (postId) {
            await apiRequest('/posts/' + postId, {
                method: 'PUT',
                body: JSON.stringify(body)
            });
        } else {
            await apiRequest('/posts', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        }
        alert('Статья сохранена');
        window.location.href = 'profile.html';
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

document.getElementById('btn-draft').addEventListener('click', async function() {
    document.getElementById('editor-form').dispatchEvent(new Event('submit'));
});

document.getElementById('btn-submit').addEventListener('click', async function() {
    const postId = document.getElementById('post-id').value;
    
    if (!postId) {
        alert('Сначала сохраните черновик');
        return;
    }

    try {
        await apiRequest('/posts/' + postId + '/submit', {
            method: 'PATCH'
        });
        alert('Статья отправлена на модерацию');
        window.location.href = 'profile.html';
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});