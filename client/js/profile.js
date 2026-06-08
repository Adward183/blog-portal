document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');

    if (profileId) {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id == profileId) {
            window.location.href = 'profile.html';
        } else {
            loadPublicProfile(profileId);
        }
    } else {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }
        updateHeader();
        loadProfile();
        loadMyPosts();
        loadStats();
    }
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

async function loadProfile() {
    try {
        const user = await apiRequest('/auth/me');

        document.querySelector('.profile-name').textContent = user.username;
        document.querySelector('.profile-email').textContent = user.email;
        document.querySelector('.profile-role').textContent = getRoleName(user.role);
        document.querySelector('.profile-date').textContent = 'На сайте с ' + new Date(user.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

        if (user.bio) {
            document.querySelector('.profile-bio').textContent = user.bio;
        }

        const avatarEl = document.querySelector('.profile-avatar');
        if (user.avatar) {
            avatarEl.src = user.avatar;
        } else {
            avatarEl.src = 'https://via.placeholder.com/150';
        }

        if (user.role === 'author' || user.role === 'moderator' || user.role === 'admin') {
            document.querySelector('.btn-write').style.display = 'inline-block';
        }

    } catch (error) {
        console.log('Ошибка загрузки профиля:', error);
    }
}

async function loadPublicProfile(userId) {
    try {
        const data = await apiRequest('/auth/profile/' + userId);
        const user = data.user;

        document.querySelector('.profile-name').textContent = user.username;
        document.querySelector('.profile-role').textContent = getRoleName(user.role);
        document.querySelector('.profile-date').textContent = 'На сайте с ' + new Date(user.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        document.querySelector('.profile-email').textContent = '';

        if (user.bio) {
            document.querySelector('.profile-bio').textContent = user.bio;
        }

        const avatarEl = document.querySelector('.profile-avatar');
        if (user.avatar) {
            avatarEl.src = user.avatar;
        } else {
            avatarEl.src = 'https://via.placeholder.com/150';
        }

        document.querySelector('.btn-write').style.display = 'none';
        document.getElementById('btn-edit-profile').style.display = 'none';

        document.querySelector('.stat-articles').textContent = data.postsCount;
        document.querySelector('.stat-views').textContent = '—';
        document.querySelector('.stat-comments').textContent = '—';

        document.querySelector('.section-title').textContent = 'Статьи автора';

        const container = document.querySelector('.profile-articles-list');
        if (data.posts.length === 0) {
            container.innerHTML = '<p class="no-posts">У автора пока нет статей</p>';
        } else {
            container.innerHTML = '';
            data.posts.forEach(post => {
                const item = document.createElement('div');
                item.className = 'profile-article';
                item.innerHTML = `
                    <div class="profile-article-info">
                        <a href="post.html?id=${post.id}" class="profile-article-title">${post.title}</a>
                        <div class="profile-article-meta">
                            <span>${new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
                            <span>👁 ${post.view_count}</span>
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });
        }

        updateHeader();

    } catch (error) {
        console.log('Ошибка загрузки публичного профиля:', error);
    }
}

async function loadMyPosts() {
    try {
        const data = await apiRequest('/posts/my/all');
        const container = document.querySelector('.profile-articles-list');

        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="no-posts">У вас пока нет статей</p>';
            return;
        }

        container.innerHTML = '';

        data.forEach(post => {
            const statusClass = post.status === 'published' ? 'published' : 
                               post.status === 'review' ? 'review' : 'draft';
            const statusText = post.status === 'published' ? 'Опубликовано' :
                              post.status === 'review' ? 'На проверке' : 'Черновик';

            const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU');

            const item = document.createElement('div');
            item.className = 'profile-article';
            item.innerHTML = `
                <div class="profile-article-info">
                    <a href="post.html?id=${post.id}" class="profile-article-title">${post.title}</a>
                    <div class="profile-article-meta">
                        <span class="article-status ${statusClass}">${statusText}</span>
                        <span>${formattedDate}</span>
                        ${post.status === 'draft' ? `<a href="editor.html?id=${post.id}" class="btn-edit">Редактировать</a>` : ''}
                        <button class="btn-delete" onclick="deletePost(${post.id})">🗑</button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });

        document.querySelector('.stat-articles').textContent = data.length;

    } catch (error) {
        console.log('Ошибка загрузки статей:', error);
    }
}

async function loadStats() {
    try {
        const stats = await apiRequest('/auth/stats');

        document.querySelector('.stat-articles').textContent = stats.posts;
        document.querySelector('.stat-views').textContent = stats.views;
        document.querySelector('.stat-comments').textContent = stats.comments;

    } catch (error) {
        console.log('Ошибка загрузки статистики:', error);
    }
}

async function deletePost(postId) {
    if (!confirm('Удалить статью?')) return;

    try {
        await apiRequest('/posts/' + postId, { method: 'DELETE' });
        showMessage('Статья удалена');
        loadMyPosts();
        loadStats();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function getRoleName(role) {
    const roles = {
        'user': 'Читатель',
        'author': 'Автор',
        'moderator': 'Модератор',
        'admin': 'Администратор'
    };
    return roles[role] || role;
}

document.getElementById('btn-edit-profile').addEventListener('click', function() {
    document.getElementById('profile-view').style.display = 'none';
    document.getElementById('profile-edit').style.display = 'block';
    document.getElementById('edit-username').value = document.querySelector('.profile-name').textContent;
    document.getElementById('edit-bio').value = document.querySelector('.profile-bio').textContent || '';
});

document.getElementById('btn-cancel-edit').addEventListener('click', function() {
    document.getElementById('profile-view').style.display = 'block';
    document.getElementById('profile-edit').style.display = 'none';
});

document.getElementById('profile-edit-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('edit-username').value;
    const bio = document.getElementById('edit-bio').value;
    const avatarUrlEl = document.getElementById('edit-avatar-url');
    const avatarFileEl = document.getElementById('edit-avatar-file');

    try {
        let user;

        if (avatarFileEl && avatarFileEl.files[0]) {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('bio', bio);
            formData.append('avatar', avatarFileEl.files[0]);

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            user = await response.json();
        } else {
            const body = { username, bio };
            if (avatarUrlEl && avatarUrlEl.value) {
                body.avatar = avatarUrlEl.value;
            }
            user = await apiRequest('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(body)
            });
        }

        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('profile-view').style.display = 'block';
        document.getElementById('profile-edit').style.display = 'none';
        loadProfile();
        showMessage('Профиль обновлён');
    } catch (error) {
        showMessage(error.message, 'error');
    }
});